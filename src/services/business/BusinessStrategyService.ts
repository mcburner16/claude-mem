import type { Database } from 'bun:sqlite';
import { logger } from '../../utils/logger.js';
import { runBusinessAgent } from './BusinessAgentRunner.js';
import type { BusinessStrategy, StrategyJson } from './types.js';

const MARKET_RESEARCH_PROMPT = `You are an autonomous business agent. Your task is to select the optimal niche and business model for an AI-powered B2B service business.

You have access to these tools:
- Apollo.io: Search for B2B contacts and companies (CEO, Founder, VP-level titles at 5-200 employee companies)
- Gmail: Send personalized cold emails and track replies
- Canva: Generate professional designs and documents
- Claude AI: Generate high-quality written content at scale

Your job is to decide on ONE specific niche where you can:
1. Find clients via Apollo.io (B2B companies who need the service)
2. Deliver value via email (AI-written content, research, or sequences)
3. Charge $97-$497 for a productized service
4. Deliver the product automatically with minimal human effort

Good options to consider:
- AI cold email sequences for SaaS companies (3-email outreach sequence + 50 qualified prospect list)
- AI-written LinkedIn post packages for founders (30 days of posts)
- AI-powered sales email templates for B2B agencies
- Competitor research reports for early-stage startups

Think carefully about which niche has the best combination of:
- Clear pain point (people actively searching for this)
- Easy to deliver with AI tools
- B2B clients who pay $97+ easily
- Low competition or differentiated angle

Respond with ONLY a JSON object (no markdown, no explanation, just JSON):
{
  "niche": "one-sentence description of the specific niche",
  "targetTitle": "comma-separated list of job titles to target (e.g. 'CEO, Founder, Head of Growth')",
  "companySizeMin": 5,
  "companySizeMax": 50,
  "offer": "one clear sentence describing exactly what they get for their money",
  "priceUsd": 97,
  "rationale": "2-3 sentences explaining why this niche + offer is the best choice right now"
}`;

export class BusinessStrategyService {
  constructor(private db: Database) {}

  getActiveStrategy(): BusinessStrategy | null {
    return this.db.prepare(
      'SELECT * FROM business_strategy WHERE active = 1 ORDER BY created_at_epoch DESC LIMIT 1'
    ).get() as BusinessStrategy | null;
  }

  async initializeStrategy(): Promise<BusinessStrategy> {
    const existing = this.getActiveStrategy();
    if (existing) return existing;

    logger.info('BUSINESS', 'No active strategy found — running autonomous niche selection');

    let strategyData: StrategyJson;
    try {
      const response = await runBusinessAgent(MARKET_RESEARCH_PROMPT, 180_000);
      strategyData = this.parseStrategyJson(response);
    } catch (error) {
      logger.warn('BUSINESS', 'Autonomous niche selection failed, using default strategy', {}, error as Error);
      strategyData = this.getDefaultStrategy();
    }

    const now = Date.now();
    const result = this.db.prepare(`
      INSERT INTO business_strategy
        (niche, target_title, target_company_size_min, target_company_size_max,
         offer_description, price_usd, stripe_payment_link, rationale, active, created_at_epoch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      strategyData.niche,
      strategyData.targetTitle,
      strategyData.companySizeMin,
      strategyData.companySizeMax,
      strategyData.offer,
      strategyData.priceUsd,
      strategyData.stripePaymentLink ?? '',
      strategyData.rationale,
      now
    );

    logger.info('BUSINESS', 'Strategy initialized', {
      niche: strategyData.niche,
      offer: strategyData.offer,
      price: strategyData.priceUsd,
    });

    return this.db.prepare('SELECT * FROM business_strategy WHERE id = ?')
      .get(result.lastInsertRowid) as BusinessStrategy;
  }

  updateStrategy(id: number, fields: Partial<Pick<BusinessStrategy, 'stripe_payment_link' | 'offer_description' | 'price_usd' | 'niche'>>): void {
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(fields)) {
      sets.push(`${key} = ?`);
      values.push(value);
    }
    if (sets.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE business_strategy SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  private parseStrategyJson(response: string): StrategyJson {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in strategy response');
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.niche || !parsed.offer) throw new Error('Invalid strategy JSON structure');
    return {
      niche: String(parsed.niche),
      targetTitle: String(parsed.targetTitle || 'CEO, Founder, Head of Growth'),
      companySizeMin: Number(parsed.companySizeMin) || 5,
      companySizeMax: Number(parsed.companySizeMax) || 50,
      offer: String(parsed.offer),
      priceUsd: Number(parsed.priceUsd) || 97,
      stripePaymentLink: 'https://buy.stripe.com/00w14pa3BeGicEadvxgEg00',
      rationale: String(parsed.rationale || ''),
    };
  }

  private getDefaultStrategy(): StrategyJson {
    return {
      niche: 'AI cold email sequences for B2B SaaS companies without a dedicated SDR',
      targetTitle: 'CEO, Founder, Co-Founder, Head of Growth, VP Sales',
      companySizeMin: 5,
      companySizeMax: 50,
      offer: '3-email cold outreach sequence + list of 50 qualified ideal-customer prospects for $97',
      priceUsd: 97,
      stripePaymentLink: 'https://buy.stripe.com/00w14pa3BeGicEadvxgEg00',
      rationale: 'B2B SaaS founders need more demos but lack time to write cold emails. AI can personalize at scale. $97 is an easy yes for a founder spending $200/hr of their own time on outreach.',
    };
  }
}
