/**
 * SubstackService
 *
 * Orchestrates article creation and publishing on Substack.
 * Reads credentials from ~/.claude-mem/settings.json:
 *   SUBSTACK_SESSION_COOKIE  — value of the substack.sid browser cookie
 *   SUBSTACK_PUBLICATION_URL — your publication root, e.g. https://yourname.substack.com
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { SubstackClient } from './SubstackClient.js';
import { markdownToTiptap } from './MarkdownToTiptap.js';

export interface SubstackCredentials {
  sessionCookie: string;
  publicationUrl: string;
}

export interface PostArticleOptions {
  title: string;
  content: string;       // Markdown text or file path (see below)
  contentIsFile?: boolean;
  subtitle?: string;
  audience?: 'everyone' | 'only_paid';
  sendEmail?: boolean;
  publishImmediately?: boolean;
}

export interface PostArticleResult {
  draftId: number;
  draftUrl: string;
  published: boolean;
  postUrl?: string;
  slug?: string;
}

function loadSettings(): Record<string, string> {
  const settingsPath = join(homedir(), '.claude-mem', 'settings.json');
  if (!existsSync(settingsPath)) return {};
  try {
    return JSON.parse(readFileSync(settingsPath, 'utf-8')) as Record<string, string>;
  } catch {
    return {};
  }
}

export function loadCredentials(): SubstackCredentials | null {
  const settings = loadSettings();
  const sessionCookie = settings.SUBSTACK_SESSION_COOKIE?.trim();
  const publicationUrl = settings.SUBSTACK_PUBLICATION_URL?.trim();

  if (!sessionCookie || !publicationUrl) return null;

  // Normalise URL
  const url = publicationUrl.startsWith('http') ? publicationUrl : `https://${publicationUrl}`;
  return { sessionCookie, publicationUrl: url };
}

export async function checkCredentials(): Promise<{
  configured: boolean;
  valid?: boolean;
  error?: string;
  publicationUrl?: string;
}> {
  const creds = loadCredentials();
  if (!creds) {
    return {
      configured: false,
      error: 'Missing SUBSTACK_SESSION_COOKIE or SUBSTACK_PUBLICATION_URL in ~/.claude-mem/settings.json',
    };
  }

  const client = new SubstackClient(creds.publicationUrl, creds.sessionCookie);
  const result = await client.verifyCredentials();
  return {
    configured: true,
    valid: result.ok,
    publicationUrl: creds.publicationUrl,
    ...(result.error && { error: result.error }),
  };
}

/**
 * Extract all image src values from markdown, upload local files to Substack,
 * and return a map of original src → resolved CDN URL.
 */
async function resolveImages(
  markdown: string,
  client: SubstackClient,
): Promise<Record<string, string>> {
  const imageMap: Record<string, string> = {};
  const IMAGE_RE = /!\[[^\]]*\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;

  while ((m = IMAGE_RE.exec(markdown)) !== null) {
    const src = m[1];
    if (imageMap[src] !== undefined) continue;

    if (src.startsWith('http://') || src.startsWith('https://')) {
      imageMap[src] = src; // external URL — use as-is
    } else {
      try {
        imageMap[src] = await client.uploadImage(src);
      } catch {
        imageMap[src] = src; // keep original on failure; Substack editor can handle broken refs
      }
    }
  }

  return imageMap;
}

export async function postArticle(opts: PostArticleOptions): Promise<PostArticleResult> {
  const creds = loadCredentials();
  if (!creds) {
    throw new Error(
      'Substack credentials not configured. ' +
      'Add SUBSTACK_SESSION_COOKIE and SUBSTACK_PUBLICATION_URL to ~/.claude-mem/settings.json'
    );
  }

  // Resolve content — may be a file path or raw markdown
  let markdown = opts.content;
  if (opts.contentIsFile) {
    if (!existsSync(opts.content)) {
      throw new Error(`File not found: ${opts.content}`);
    }
    markdown = readFileSync(opts.content, 'utf-8');
  }

  const client = new SubstackClient(creds.publicationUrl, creds.sessionCookie);

  // Upload local images and resolve all image URLs before converting
  const imageMap = await resolveImages(markdown, client);
  const bodyDoc = markdownToTiptap(markdown, imageMap);

  const draft = await client.createDraft(
    opts.title,
    bodyDoc,
    opts.subtitle,
    opts.audience ?? 'everyone',
  );

  const result: PostArticleResult = {
    draftId: draft.id,
    draftUrl: client.getDraftUrl(draft.id),
    published: false,
    slug: draft.slug,
  };

  if (opts.publishImmediately !== false) {
    const published = await client.publishDraft(draft.id, opts.sendEmail ?? false);
    result.published = true;
    result.slug = published.slug ?? draft.slug;
    result.postUrl = published.canonical_url ?? client.getPostUrl(result.slug ?? draft.slug);
  }

  return result;
}

export async function saveDraft(opts: PostArticleOptions): Promise<PostArticleResult> {
  return postArticle({ ...opts, publishImmediately: false });
}
