import express, { Request, Response } from 'express';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import type { DatabaseManager } from '../../DatabaseManager.js';
import { BusinessLoop } from '../../../business/BusinessLoop.js';
import { BusinessStrategyService } from '../../../business/BusinessStrategyService.js';
import { PipelineService } from '../../../business/PipelineService.js';
import { ProspectingService } from '../../../business/ProspectingService.js';
import { DeliveryService } from '../../../business/DeliveryService.js';

export class BusinessRoutes extends BaseRouteHandler {
  private loop: BusinessLoop;
  private strategyService: BusinessStrategyService;
  private pipelineService: PipelineService;
  private prospectingService: ProspectingService;
  private deliveryService: DeliveryService;

  constructor(private dbManager: DatabaseManager) {
    super();
    const db = dbManager.getSessionStore().db;
    this.loop = new BusinessLoop(db);
    this.strategyService = new BusinessStrategyService(db);
    this.pipelineService = new PipelineService(db);
    this.prospectingService = new ProspectingService(db);
    this.deliveryService = new DeliveryService(db);
  }

  setupRoutes(app: express.Application): void {
    app.get('/api/business/strategy', this.wrapHandler(this.getStrategy.bind(this)));
    app.post('/api/business/strategy', this.wrapHandler(this.updateStrategy.bind(this)));
    app.post('/api/business/strategy/initialize', this.wrapHandler(this.initializeStrategy.bind(this)));

    app.get('/api/business/pipeline', this.wrapHandler(this.getPipeline.bind(this)));
    app.get('/api/business/prospects', this.wrapHandler(this.getProspects.bind(this)));
    app.post('/api/business/prospects/:id/advance', this.wrapHandler(this.advanceProspect.bind(this)));

    app.get('/api/business/deals', this.wrapHandler(this.getDeals.bind(this)));
    app.post('/api/business/deals/:id/paid', this.wrapHandler(this.markDealPaid.bind(this)));

    app.get('/api/business/deliverables', this.wrapHandler(this.getDeliverables.bind(this)));

    app.post('/api/business/loop/run', this.wrapHandler(this.triggerLoop.bind(this)));
    app.get('/api/business/loop/status', this.wrapHandler(this.getLoopStatus.bind(this)));

    app.get('/api/business/stats', this.wrapHandler(this.getStats.bind(this)));
  }

  private getStrategy(req: Request, res: Response): void {
    const strategy = this.strategyService.getActiveStrategy();
    res.json({ strategy });
  }

  private updateStrategy(req: Request, res: Response): void {
    const strategy = this.strategyService.getActiveStrategy();
    if (!strategy) {
      this.notFound(res, 'No active strategy');
      return;
    }
    const { stripe_payment_link, offer_description, price_usd, niche } = req.body;
    this.strategyService.updateStrategy(strategy.id, { stripe_payment_link, offer_description, price_usd, niche });
    res.json({ ok: true });
  }

  private async initializeStrategy(req: Request, res: Response): Promise<void> {
    const strategy = await this.strategyService.initializeStrategy();
    res.json({ strategy });
  }

  private getPipeline(req: Request, res: Response): void {
    const summary = this.pipelineService.getPipelineSummary();
    res.json(summary);
  }

  private getProspects(req: Request, res: Response): void {
    const stage = (req.query.stage as string) || undefined;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const prospects = stage
      ? this.prospectingService.getProspectsByStage(stage, limit)
      : this.dbManager.getSessionStore().db.prepare('SELECT * FROM prospects ORDER BY created_at_epoch DESC LIMIT ?').all(limit);
    res.json({ prospects });
  }

  private advanceProspect(req: Request, res: Response): void {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;
    const { stage } = req.body;
    if (!stage) {
      this.badRequest(res, 'Missing stage');
      return;
    }
    this.prospectingService.updateProspectStage(id, stage);
    res.json({ ok: true });
  }

  private getDeals(req: Request, res: Response): void {
    const deals = this.pipelineService.getAllDeals();
    res.json({ deals });
  }

  private markDealPaid(req: Request, res: Response): void {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;
    if (!this.validateRequired(req, res, ['paymentReference'])) return;
    const deal = this.pipelineService.markDealPaid(id, req.body.paymentReference, req.body.paymentMethod);
    res.json({ deal });
  }

  private getDeliverables(req: Request, res: Response): void {
    const deliverables = this.deliveryService.getAllDeliverables();
    res.json({ deliverables });
  }

  private triggerLoop(req: Request, res: Response): void {
    this.loop.runDailyCycle().then(result => {
      // Result logged internally; no-op here
    }).catch(() => {});
    res.json({ status: 'started', message: 'Business cycle triggered — check logs for progress' });
  }

  private getLoopStatus(req: Request, res: Response): void {
    const status = this.loop.getLastRunStatus();
    res.json(status);
  }

  private getStats(req: Request, res: Response): void {
    const stats = this.pipelineService.getStats();
    res.json(stats);
  }
}
