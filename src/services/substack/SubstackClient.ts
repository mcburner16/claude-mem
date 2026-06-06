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

import { readFileSync, existsSync } from 'fs';
import { extname, basename } from 'path';

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

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

  /**
   * Upload a local image file to Substack's CDN.
   * Returns the hosted image URL.
   */
  async uploadImage(filePath: string): Promise<string> {
    if (!existsSync(filePath)) {
      throw new Error(`Image file not found: ${filePath}`);
    }

    const ext = extname(filePath).toLowerCase();
    const mimeType = MIME_MAP[ext] ?? 'application/octet-stream';
    const fileBuffer = readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: mimeType });

    const formData = new FormData();
    formData.append('image', blob, basename(filePath));

    const res = await fetch(`${this.baseUrl}/api/v1/image`, {
      method: 'POST',
      // No Content-Type header — fetch sets multipart/form-data with boundary automatically
      headers: { 'Cookie': this.cookieHeader },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Substack image upload failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { url?: string };
    if (!data.url) {
      throw new Error('Substack image upload returned no URL');
    }
    return data.url;
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
