import express, { Request, Response } from 'express';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import { checkCredentials, postArticle, saveDraft } from '../../../substack/SubstackService.js';

export class SubstackRoutes extends BaseRouteHandler {
  setupRoutes(app: express.Application): void {
    app.get('/api/substack/status', this.wrapHandler(this.getStatus.bind(this)));
    app.post('/api/substack/post', this.wrapHandler(this.createPost.bind(this)));
    app.post('/api/substack/draft', this.wrapHandler(this.createDraft.bind(this)));
  }

  /**
   * GET /api/substack/status
   * Verifies credentials are configured and valid.
   */
  private async getStatus(req: Request, res: Response): Promise<void> {
    const result = await checkCredentials();
    res.json(result);
  }

  /**
   * POST /api/substack/post
   * Create and publish an article.
   *
   * Body:
   *   title            string (required)
   *   content          string (required) — markdown text or file path
   *   contentIsFile    boolean (optional, default false)
   *   subtitle         string (optional)
   *   audience         "everyone" | "only_paid" (optional, default "everyone")
   *   sendEmail        boolean (optional, default false)
   */
  private async createPost(req: Request, res: Response): Promise<void> {
    const { title, content, contentIsFile, subtitle, audience, sendEmail } = req.body;

    if (!title || typeof title !== 'string') {
      this.badRequest(res, 'Missing required field: title');
      return;
    }
    if (!content || typeof content !== 'string') {
      this.badRequest(res, 'Missing required field: content');
      return;
    }

    const result = await postArticle({
      title,
      content,
      contentIsFile: Boolean(contentIsFile),
      subtitle: typeof subtitle === 'string' ? subtitle : undefined,
      audience: audience === 'only_paid' ? 'only_paid' : 'everyone',
      sendEmail: Boolean(sendEmail),
      publishImmediately: true,
    });

    res.json({ success: true, ...result });
  }

  /**
   * POST /api/substack/draft
   * Create a draft without publishing.
   *
   * Body: same as /post (publishImmediately is forced false)
   */
  private async createDraft(req: Request, res: Response): Promise<void> {
    const { title, content, contentIsFile, subtitle, audience } = req.body;

    if (!title || typeof title !== 'string') {
      this.badRequest(res, 'Missing required field: title');
      return;
    }
    if (!content || typeof content !== 'string') {
      this.badRequest(res, 'Missing required field: content');
      return;
    }

    const result = await saveDraft({
      title,
      content,
      contentIsFile: Boolean(contentIsFile),
      subtitle: typeof subtitle === 'string' ? subtitle : undefined,
      audience: audience === 'only_paid' ? 'only_paid' : 'everyone',
    });

    res.json({ success: true, ...result });
  }
}
