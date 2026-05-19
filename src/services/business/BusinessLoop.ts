import type { Database } from 'bun:sqlite';
import { logger } from '../../utils/logger.js';
import { BusinessStrategyService } from './BusinessStrategyService.js';
import { ProspectingService } from './ProspectingService.js';
import { OutreachService } from './OutreachService.js';
import { PipelineService } from './PipelineService.js';
import { DeliveryService } from './DeliveryService.js';

const DEFAULT_INTERVAL_HOURS = 24;
const OUTREACH_BATCH_SIZE = 5;

function getIntervalMs(): number {
  const hours = parseFloat(process.env.BUSINESS_LOOP_INTERVAL_HOURS ?? '') || DEFAULT_INTERVAL_HOURS;
  return Math.max(hours * 3_600_000, 60_000);
}

export class BusinessLoop {
  private strategyService: BusinessStrategyService;
  private prospectingService: ProspectingService;
  private outreachService: OutreachService;
  private pipelineService: PipelineService;
  private deliveryService: DeliveryService;
  private isRunning = false;

  constructor(private db: Database) {
    this.strategyService = new BusinessStrategyService(db);
    this.prospectingService = new ProspectingService(db);
    this.outreachService = new OutreachService(db);
    this.pipelineService = new PipelineService(db);
    this.deliveryService = new DeliveryService(db);
  }

  start(): () => void {
    const enabled = process.env.BUSINESS_LOOP_ENABLED !== 'false';
    if (!enabled) {
      logger.info('BUSINESS', 'Business loop disabled via BUSINESS_LOOP_ENABLED=false');
      return () => {};
    }

    const intervalMs = getIntervalMs();
    logger.info('BUSINESS', `Business loop started (interval: ${intervalMs / 3_600_000}h)`);

    // Run once at startup (non-blocking)
    setTimeout(() => {
      this.runDailyCycle().catch(err =>
        logger.error('BUSINESS', 'Initial business cycle failed', {}, err as Error)
      );
    }, 5_000);

    const handle = setInterval(() => {
      this.runDailyCycle().catch(err =>
        logger.error('BUSINESS', 'Business cycle failed', {}, err as Error)
      );
    }, intervalMs);

    return () => clearInterval(handle);
  }

  async runDailyCycle(): Promise<{ prospectsFound: number; emailsDrafted: number; deliverablesGenerated: number; errors: string[] }> {
    if (this.isRunning) {
      logger.warn('BUSINESS', 'Daily cycle already running, skipping');
      return { prospectsFound: 0, emailsDrafted: 0, deliverablesGenerated: 0, errors: ['already_running'] };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const errors: string[] = [];
    let prospectsFound = 0;
    let emailsDrafted = 0;
    let deliverablesGenerated = 0;

    logger.info('BUSINESS', 'Starting daily business cycle');

    try {
      // 1. Strategy check
      const strategy = await this.strategyService.initializeStrategy();
      logger.info('BUSINESS', `Active strategy: ${strategy.niche}`);

      // 2. Find new prospects via Apollo
      try {
        prospectsFound = await this.prospectingService.findNewProspects(strategy, 10);
        logger.info('BUSINESS', `Found ${prospectsFound} new prospects`);
      } catch (e) {
        errors.push('prospecting: ' + (e as Error).message);
      }

      // 3. Qualify found prospects
      try {
        const qualified = this.prospectingService.qualifyProspects(strategy);
        if (qualified > 0) logger.info('BUSINESS', `Qualified ${qualified} prospects`);
      } catch (e) {
        errors.push('qualification: ' + (e as Error).message);
      }

      // 4. Draft outreach emails (human reviews before sending)
      try {
        const qualified = this.prospectingService.getProspectsByStage('qualified', OUTREACH_BATCH_SIZE);
        if (qualified.length > 0) {
          emailsDrafted = await this.outreachService.draftOutreach(qualified, strategy);
          if (emailsDrafted > 0) {
            logger.info('BUSINESS', `ACTION REQUIRED: ${emailsDrafted} draft emails ready at gmail.com/drafts — review and send`);
          }
        }
      } catch (e) {
        errors.push('outreach: ' + (e as Error).message);
      }

      // 5. Detect replies and create deals
      try {
        const contacted = this.prospectingService.getProspectsByStage('contacted', 50);
        if (contacted.length > 0) {
          const replies = await this.pipelineService.checkForReplies(contacted);
          if (replies > 0) logger.info('BUSINESS', `Detected ${replies} positive replies — deals created`);
        }
      } catch (e) {
        errors.push('reply_detection: ' + (e as Error).message);
      }

      // 6. Payment reminders for open deals
      try {
        const awaitingPayment = this.pipelineService.getDealsAwaitingPayment();
        for (const deal of awaitingPayment) {
          const ageHours = (Date.now() - deal.created_at_epoch) / 3_600_000;
          if (ageHours > 24) {
            const p = deal as any;
            logger.info('BUSINESS', `PAYMENT REMINDER: Deal #${deal.id} for ${p.first_name} ${p.last_name} at ${p.company} — send payment link: ${deal.stripe_payment_link || '[set BUSINESS_STRIPE_PAYMENT_LINK]'}`);
          }
        }
      } catch (e) {
        errors.push('payment_reminders: ' + (e as Error).message);
      }

      // 7. Generate deliverables for paid deals
      try {
        const paidDeals = this.db.prepare(
          "SELECT * FROM deals WHERE stage = 'paid' LIMIT 3"
        ).all() as any[];
        for (const deal of paidDeals) {
          try {
            await this.deliveryService.generateDeliverable(deal);
            deliverablesGenerated++;
          } catch (e) {
            errors.push(`delivery_deal_${deal.id}: ` + (e as Error).message);
          }
        }
      } catch (e) {
        errors.push('delivery: ' + (e as Error).message);
      }

      // 8. Draft follow-up emails
      try {
        const followUps = await this.outreachService.draftFollowUps(strategy);
        if (followUps > 0) {
          emailsDrafted += followUps;
          logger.info('BUSINESS', `Drafted ${followUps} follow-up emails`);
        }
      } catch (e) {
        errors.push('followups: ' + (e as Error).message);
      }

    } finally {
      this.isRunning = false;
      const durationMs = Date.now() - startTime;

      this.db.prepare(`
        INSERT INTO business_loop_runs
          (run_at_epoch, prospects_found, emails_drafted, deliverables_generated, errors, duration_ms)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        startTime,
        prospectsFound,
        emailsDrafted,
        deliverablesGenerated,
        errors.length > 0 ? JSON.stringify(errors) : null,
        durationMs
      );

      logger.info('BUSINESS', 'Daily cycle complete', {
        durationMs,
        prospectsFound,
        emailsDrafted,
        deliverablesGenerated,
        errors: errors.length,
      });
    }

    return { prospectsFound, emailsDrafted, deliverablesGenerated, errors };
  }

  getLastRunStatus(): { lastRun: any; nextRunIn: string | null } {
    const lastRun = this.db.prepare(
      'SELECT * FROM business_loop_runs ORDER BY run_at_epoch DESC LIMIT 1'
    ).get();
    return { lastRun, nextRunIn: this.isRunning ? 'running' : null };
  }
}
