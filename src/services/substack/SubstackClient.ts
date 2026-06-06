/**
 * SubstackClient
 *
 * Low-level HTTP client for Substack's private API.
 * Authenticates via session cookie (substack.sid) extracted from a logged-in browser.
 *
 * API base: https://{publication}.substack.com
 */

export interface SubstackDraft {
  id: number;
  slug: string;
  draft_title: string;
  draft_subtitle: string;
  draft_body: string;
  audience: string;
  type: string;
}

export interface SubstackPublishResult {
  id: number;
  slug: string;
  canonical_url?: string;
  post_date?: string;
}

export class SubstackClient {
  private baseUrl: string;
  private cookieHeader: string;

  constructor(publicationUrl: string, sessionCookie: string) {
    this.baseUrl = publicationUrl.replace(/\/$/, '');
    // Accept bare cookie value or full "substack.sid=..." string
    this.cookieHeader = sessionCookie.startsWith('substack.sid=')
      ? sessionCookie
      : `substack.sid=${sessionCookie}`;
  }

  private get defaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Cookie': this.cookieHeader,
      'User-Agent': 'Mozilla/5.0 (compatible; claude-mem/1.0)',
    };
  }

  async verifyCredentials(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/drafts?limit=1`, {
        headers: this.defaultHeaders,
      });
      if (res.ok) return { ok: true };
      return { ok: false, error: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async createDraft(
    title: string,
    bodyDoc: object,
    subtitle?: string,
    audience: 'everyone' | 'only_paid' = 'everyone',
  ): Promise<SubstackDraft> {
    const res = await fetch(`${this.baseUrl}/api/v1/drafts`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({
        draft_title: title,
        draft_subtitle: subtitle ?? '',
        draft_body: JSON.stringify(bodyDoc),
        draft_byline_name: null,
        section_chosen: false,
        audience,
        type: 'newsletter',
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Substack createDraft failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<SubstackDraft>;
  }

  async updateDraft(
    id: number,
    title: string,
    bodyDoc: object,
    subtitle?: string,
    audience: 'everyone' | 'only_paid' = 'everyone',
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/v1/drafts/${id}`, {
      method: 'PUT',
      headers: this.defaultHeaders,
      body: JSON.stringify({
        draft_title: title,
        draft_subtitle: subtitle ?? '',
        draft_body: JSON.stringify(bodyDoc),
        audience,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Substack updateDraft failed (${res.status}): ${text}`);
    }
  }

  async publishDraft(
    id: number,
    sendEmail: boolean = false,
  ): Promise<SubstackPublishResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/drafts/${id}/publish`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({
        send: sendEmail,
        share_automatically: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Substack publishDraft failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<SubstackPublishResult>;
  }

  getDraftUrl(id: number): string {
    return `${this.baseUrl}/publish/post/${id}`;
  }

  getPostUrl(slug: string): string {
    return `${this.baseUrl}/p/${slug}`;
  }
}
