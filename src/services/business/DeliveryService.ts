import type { Database } from 'bun:sqlite';
import { logger } from '../../utils/logger.js';
import { runBusinessAgent } from './BusinessAgentRunner.js';
import type { BusinessStrategy, Deal, Deliverable, Prospect } from './types.js';

export class DeliveryService {
  constructor(private db: Database) {}

  async generateDeliverable(deal: Deal): Promise<Deliverable> {
    const prospect = this.db.prepare('SELECT * FROM prospects WHERE id = ?')
      .get(deal.prospect_id) as Prospect | null;
    if (!prospect) throw new Error(`Prospect ${deal.prospect_id} not found`);

    const strategy = this.db.prepare(
      'SELECT * FROM business_strategy WHERE active = 1 LIMIT 1'
    ).get() as BusinessStrategy | null;
    if (!strategy) throw new Error('No active strategy found');

    const now = Date.now();
    const result = this.db.prepare(`
      INSERT INTO deliverables
        (deal_id, prospect_id, type, status, created_at_epoch)
      VALUES (?, ?, 'email_sequence', 'generating', ?)
    `).run(deal.id, deal.prospect_id, now);
    const deliverableId = Number(result.lastInsertRowid);

    try {
      const content = await this.generateEmailSequence(prospect, strategy);
      const draftId = await this.createDeliveryDraft(prospect, content, deal);

      this.db.prepare(`
        UPDATE deliverables
        SET status = 'complete', content = ?, gmail_draft_id = ?, completed_at_epoch = ?
        WHERE id = ?
      `).run(JSON.stringify(content), draftId, Date.now(), deliverableId);

      this.db.prepare(`
        UPDATE deals SET stage = 'delivered', updated_at_epoch = ? WHERE id = ?
      `).run(Date.now(), deal.id);

      this.db.prepare(`
        UPDATE prospects SET stage = 'delivered', updated_at_epoch = ? WHERE id = ?
      `).run(Date.now(), prospect.id);

      logger.info('BUSINESS', `Deliverable generated for deal ${deal.id}`, { draftId });
    } catch (error) {
      this.db.prepare(
        'UPDATE deliverables SET status = "failed", completed_at_epoch = ? WHERE id = ?'
      ).run(Date.now(), deliverableId);
      logger.error('BUSINESS', `Delivery failed for deal ${deal.id}`, {}, error as Error);
      throw error;
    }

    return this.db.prepare('SELECT * FROM deliverables WHERE id = ?')
      .get(deliverableId) as Deliverable;
  }

  private async generateEmailSequence(prospect: Prospect, strategy: BusinessStrategy): Promise<Record<string, string>> {
    const prompt = `Generate a 3-email cold outreach sequence for a client who just paid for our service.

CLIENT'S BUSINESS:
- Name: ${prospect.first_name} ${prospect.last_name}
- Title: ${prospect.title} at ${prospect.company}
- Industry: ${prospect.industry ?? 'technology'}

OUR SERVICE DESCRIPTION: ${strategy.offer_description}

Create a 3-email sequence the client can use to find customers for THEIR business.
The sequence should target companies who would buy ${prospect.company}'s product.

Respond with ONLY a JSON object:
{
  "sequence_title": "Title for this sequence (e.g. 'SaaS Demo Request Sequence')",
  "target_description": "Who to target with this sequence",
  "email_1": {
    "subject": "...",
    "body": "..."
  },
  "email_2": {
    "subject": "...",
    "body": "...",
    "send_after_days": 4
  },
  "email_3": {
    "subject": "...",
    "body": "...",
    "send_after_days": 8
  },
  "prospect_search_criteria": "Apollo.io search criteria to find 50 ideal prospects for this sequence"
}

Each email must include: "To unsubscribe, reply STOP."
Make emails highly personalized, direct, and conversion-focused.`;

    const response = await runBusinessAgent(prompt, 120_000);
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in delivery response');
    return JSON.parse(match[0]);
  }

  private async createDeliveryDraft(prospect: Prospect, content: Record<string, string>, deal: Deal): Promise<string | null> {
    if (!prospect.email) return null;

    const sequenceText = JSON.stringify(content, null, 2);
    const prompt = `Create a Gmail draft delivering a paid service order.

Use the create_draft tool with:
- to: ["${prospect.email}"]
- subject: "Your AI email sequence is ready — ${prospect.first_name}"
- body: |
  Hi ${prospect.first_name},

  Your order is ready! Here's your custom 3-email cold outreach sequence for ${prospect.company}:

  ${content['sequence_title'] ?? 'Your Email Sequence'}
  Target: ${content['target_description'] ?? ''}

  --- EMAIL 1 ---
  Subject: ${(content['email_1'] as any)?.subject ?? ''}
  ${(content['email_1'] as any)?.body ?? ''}

  --- EMAIL 2 (send day ${(content['email_2'] as any)?.send_after_days ?? 4}) ---
  Subject: ${(content['email_2'] as any)?.subject ?? ''}
  ${(content['email_2'] as any)?.body ?? ''}

  --- EMAIL 3 (send day ${(content['email_3'] as any)?.send_after_days ?? 8}) ---
  Subject: ${(content['email_3'] as any)?.subject ?? ''}
  ${(content['email_3'] as any)?.body ?? ''}

  --- PROSPECT SEARCH CRITERIA ---
  To find 50 ideal prospects on Apollo.io:
  ${content['prospect_search_criteria'] ?? ''}

  Let me know if you'd like any adjustments.

  Best,
  [Your name]

After creating the draft, respond with ONLY the draft ID.`;

    const response = await runBusinessAgent(prompt, 60_000);
    const trimmed = response.trim();
    const idMatch = trimmed.match(/\b([a-zA-Z0-9_\-]{10,})\b/);
    return idMatch ? idMatch[1] : null;
  }

  getAllDeliverables(): Deliverable[] {
    return this.db.prepare(
      'SELECT * FROM deliverables ORDER BY created_at_epoch DESC'
    ).all() as Deliverable[];
  }
}
