import type { Database } from 'bun:sqlite';
import { logger } from '../../utils/logger.js';
import { runBusinessAgent } from './BusinessAgentRunner.js';
import type { BusinessStrategy, Prospect } from './types.js';

const FOLLOW_UP_DAYS = 7;
const MS_PER_DAY = 86_400_000;

export class OutreachService {
  constructor(private db: Database) {}

  async draftOutreach(prospects: Prospect[], strategy: BusinessStrategy): Promise<number> {
    if (prospects.length === 0) return 0;

    let drafted = 0;
    for (const prospect of prospects) {
      try {
        const draftId = await this.createInitialDraft(prospect, strategy);
        if (draftId) {
          this.db.prepare(`
            UPDATE prospects
            SET stage = 'contacted', last_contacted_epoch = ?, updated_at_epoch = ?, notes = ?
            WHERE id = ?
          `).run(Date.now(), Date.now(), `gmail_draft:${draftId}`, prospect.id);
          drafted++;
        }
      } catch (error) {
        logger.error('BUSINESS', `Failed to draft outreach for prospect ${prospect.id}`, {}, error as Error);
      }
    }

    if (drafted > 0) {
      logger.info('BUSINESS', `Created ${drafted} outreach drafts — review at gmail.com/drafts before sending`);
    }
    return drafted;
  }

  async draftFollowUps(strategy: BusinessStrategy): Promise<number> {
    const cutoff = Date.now() - FOLLOW_UP_DAYS * MS_PER_DAY;
    const stale = this.db.prepare(`
      SELECT * FROM prospects
      WHERE stage = 'contacted'
        AND follow_up_count < 2
        AND (last_contacted_epoch IS NULL OR last_contacted_epoch < ?)
      LIMIT 5
    `).all(cutoff) as Prospect[];

    if (stale.length === 0) return 0;

    let drafted = 0;
    for (const prospect of stale) {
      try {
        const sequencePos = (prospect.follow_up_count ?? 0) + 2;
        const draftId = await this.createFollowUpDraft(prospect, strategy, sequencePos);
        if (draftId) {
          this.db.prepare(`
            UPDATE prospects
            SET last_contacted_epoch = ?, follow_up_count = follow_up_count + 1, updated_at_epoch = ?
            WHERE id = ?
          `).run(Date.now(), Date.now(), prospect.id);
          drafted++;
        }
      } catch (error) {
        logger.error('BUSINESS', `Failed to draft follow-up for prospect ${prospect.id}`, {}, error as Error);
      }
    }
    return drafted;
  }

  private async createInitialDraft(prospect: Prospect, strategy: BusinessStrategy): Promise<string | null> {
    if (!prospect.email) return null;

    const prompt = `Create a cold email outreach draft in Gmail for this prospect.

Prospect details:
- Name: ${prospect.first_name} ${prospect.last_name}
- Title: ${prospect.title}
- Company: ${prospect.company}
- Industry: ${prospect.industry ?? 'technology'}

Our offer: ${strategy.offer_description}
Price: $${strategy.price_usd}

Write a SHORT (3-paragraph), personalized cold email that:
1. Opens with a specific observation about their role/company (no generic openers)
2. Presents our offer as a clear solution to a specific pain they have
3. Ends with a soft CTA: "Would a free sample be useful? Happy to share one."

Tone: Direct, peer-to-peer, no fluff. Write like a human, not a salesperson.

IMPORTANT compliance footer to include verbatim:
"To unsubscribe, reply with STOP. [Your Company Name] | [City, State] | [Website]"

Use the create_draft Gmail tool with:
- to: ["${prospect.email}"]
- subject: [compelling subject line, max 8 words, no "AI" in subject]
- body: [the email text]

After creating the draft, respond with ONLY the draft ID from the tool response (just the ID string, nothing else).`;

    const response = await runBusinessAgent(prompt, 60_000);
    const draftId = this.extractDraftId(response);
    logger.debug('BUSINESS', `Created initial draft`, { prospectId: prospect.id, draftId });
    return draftId;
  }

  private async createFollowUpDraft(prospect: Prospect, strategy: BusinessStrategy, sequencePos: number): Promise<string | null> {
    if (!prospect.email) return null;

    const isLastFollowUp = sequencePos >= 3;
    const prompt = `Create a follow-up cold email draft in Gmail.

Prospect: ${prospect.first_name} ${prospect.last_name} at ${prospect.company}
This is follow-up #${sequencePos - 1} (${isLastFollowUp ? 'final follow-up' : 'second touch'}).

Our offer: ${strategy.offer_description}

Write a ${isLastFollowUp ? 'brief final "break-up" email' : 'short follow-up'} that:
${isLastFollowUp
  ? '- Acknowledges this is the last email\n- Leaves the door open gracefully\n- Offers the sample one more time'
  : '- References your previous email (without being pushy)\n- Adds one new angle or insight\n- Keeps it under 4 sentences'}

Include the unsubscribe footer: "To unsubscribe, reply with STOP."

Use the create_draft Gmail tool with:
- to: ["${prospect.email}"]
- subject: [Re: previous subject or new angle, max 8 words]
- body: [the email]

After creating the draft, respond with ONLY the draft ID.`;

    const response = await runBusinessAgent(prompt, 60_000);
    return this.extractDraftId(response);
  }

  private extractDraftId(response: string): string | null {
    const trimmed = response.trim();
    // Match Gmail draft ID patterns (e.g. r123456789, 18abc...)
    const idMatch = trimmed.match(/\b([a-zA-Z0-9_\-]{10,})\b/);
    if (idMatch) return idMatch[1];
    if (trimmed.length > 0 && trimmed.length < 100 && !trimmed.includes(' ')) return trimmed;
    return null;
  }
}
