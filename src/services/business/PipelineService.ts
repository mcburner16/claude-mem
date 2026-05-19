import type { Database } from 'bun:sqlite';
import { logger } from '../../utils/logger.js';
import { runBusinessAgent } from './BusinessAgentRunner.js';
import type { Deal, PipelineSummary, Prospect } from './types.js';

export class PipelineService {
  constructor(private db: Database) {}

  async checkForReplies(contactedProspects: Prospect[]): Promise<number> {
    if (contactedProspects.length === 0) return 0;

    const emailList = contactedProspects
      .filter(p => p.email)
      .map(p => `- ${p.first_name} ${p.last_name} <${p.email}> (prospect id: ${p.id})`)
      .join('\n');

    if (!emailList) return 0;

    const prompt = `Search Gmail for replies from any of these prospects:
${emailList}

Use the search_threads Gmail tool with query: "from:(${contactedProspects.filter(p => p.email).map(p => p.email).join(' OR ')})"

For each thread found, use get_thread to check if the prospect replied (not just our outreach).

Respond with ONLY a JSON array of prospect IDs who replied positively (interested, asking questions, or wanting to learn more):
[1, 5, 12]

If no positive replies, return: []`;

    let repliedIds: number[] = [];
    try {
      const response = await runBusinessAgent(prompt, 60_000);
      const match = response.match(/\[[\s\S]*?\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        repliedIds = Array.isArray(parsed) ? parsed.filter((x: any) => typeof x === 'number') : [];
      }
    } catch (error) {
      logger.error('BUSINESS', 'Reply detection failed', {}, error as Error);
      return 0;
    }

    const now = Date.now();
    for (const prospectId of repliedIds) {
      this.db.prepare(`
        UPDATE prospects SET stage = 'replied', updated_at_epoch = ? WHERE id = ?
      `).run(now, prospectId);
      this.createDeal(prospectId);
      logger.info('BUSINESS', `Reply detected — created deal for prospect ${prospectId}`);
    }

    return repliedIds.length;
  }

  createDeal(prospectId: number, amountUsd?: number): Deal {
    const existing = this.db.prepare(
      'SELECT * FROM deals WHERE prospect_id = ? AND stage != "refunded"'
    ).get(prospectId) as Deal | null;
    if (existing) return existing;

    const strategy = this.db.prepare(
      'SELECT price_usd, stripe_payment_link FROM business_strategy WHERE active = 1 LIMIT 1'
    ).get() as { price_usd: number; stripe_payment_link: string } | null;

    const now = Date.now();
    const result = this.db.prepare(`
      INSERT INTO deals
        (prospect_id, stage, amount_usd, stripe_payment_link, created_at_epoch, updated_at_epoch)
      VALUES (?, 'awaiting_payment', ?, ?, ?, ?)
    `).run(
      prospectId,
      amountUsd ?? strategy?.price_usd ?? 97,
      strategy?.stripe_payment_link ?? '',
      now, now
    );

    return this.db.prepare('SELECT * FROM deals WHERE id = ?')
      .get(result.lastInsertRowid) as Deal;
  }

  markDealPaid(dealId: number, paymentReference: string, paymentMethod?: string): Deal {
    const now = Date.now();
    this.db.prepare(`
      UPDATE deals
      SET stage = 'paid', payment_reference = ?, paid_at_epoch = ?, updated_at_epoch = ?
      WHERE id = ?
    `).run(paymentReference, now, now, dealId);

    const deal = this.db.prepare('SELECT * FROM deals WHERE id = ?').get(dealId) as Deal | null;
    if (!deal) throw new Error(`Deal ${dealId} not found`);

    this.db.prepare(`
      UPDATE prospects SET stage = 'sold', updated_at_epoch = ? WHERE id = ?
    `).run(now, deal.prospect_id);

    logger.info('BUSINESS', `Deal ${dealId} marked as paid`, { paymentReference });
    return deal;
  }

  getPipelineSummary(): PipelineSummary {
    const stageCounts = this.db.prepare(
      'SELECT stage, COUNT(*) as count FROM prospects GROUP BY stage'
    ).all() as { stage: string; count: number }[];

    const stages: Record<string, number> = {};
    for (const row of stageCounts) stages[row.stage] = row.count;

    const dealCounts = this.db.prepare(
      'SELECT stage, COUNT(*) as count, SUM(amount_usd) as total FROM deals GROUP BY stage'
    ).all() as { stage: string; count: number; total: number }[];

    const dealMap: Record<string, { count: number; total: number }> = {};
    for (const row of dealCounts) dealMap[row.stage] = { count: row.count, total: row.total ?? 0 };

    const lastRun = this.db.prepare(
      'SELECT run_at_epoch FROM business_loop_runs ORDER BY run_at_epoch DESC LIMIT 1'
    ).get() as { run_at_epoch: number } | null;

    return {
      stages: stages as any,
      total_deals: Object.values(dealMap).reduce((s, v) => s + v.count, 0),
      deals_awaiting_payment: dealMap['awaiting_payment']?.count ?? 0,
      deals_paid: dealMap['paid']?.count ?? 0,
      deals_delivered: dealMap['delivered']?.count ?? 0,
      total_revenue_usd: dealMap['paid']?.total ?? 0 + (dealMap['delivered']?.total ?? 0),
      last_run_at: lastRun?.run_at_epoch ?? null,
    };
  }

  getDealsAwaitingPayment(): Array<Deal & { prospect: Prospect }> {
    return this.db.prepare(`
      SELECT d.*, p.first_name, p.last_name, p.company, p.email
      FROM deals d
      JOIN prospects p ON p.id = d.prospect_id
      WHERE d.stage = 'awaiting_payment'
      ORDER BY d.created_at_epoch ASC
    `).all() as any[];
  }

  getDeal(id: number): Deal | null {
    return this.db.prepare('SELECT * FROM deals WHERE id = ?').get(id) as Deal | null;
  }

  getAllDeals(): Deal[] {
    return this.db.prepare('SELECT * FROM deals ORDER BY created_at_epoch DESC').all() as Deal[];
  }

  getStats(): Record<string, unknown> {
    const summary = this.getPipelineSummary();
    const contacted = (summary.stages as any)['contacted'] ?? 0;
    const replied = (summary.stages as any)['replied'] ?? 0 + (summary.stages as any)['interested'] ?? 0;
    const replyRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;

    return {
      ...summary,
      reply_rate_pct: replyRate,
      avg_deal_usd: summary.total_deals > 0
        ? Math.round(summary.total_revenue_usd / (summary.deals_paid + summary.deals_delivered || 1))
        : 0,
    };
  }
}
