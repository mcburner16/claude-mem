/**
 * MarkdownToTiptap
 *
 * Converts Markdown text to a Tiptap/ProseMirror document object
 * compatible with Substack's editor format.
 *
 * Supports: headings, paragraphs, bullet/ordered lists, blockquotes,
 * code blocks, horizontal rules, and inline bold/italic/code/links.
 */

type TiptapMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'code' }
  | { type: 'strike' }
  | { type: 'link'; attrs: { href: string; target?: string } };

type TiptapTextNode = {
  type: 'text';
  text: string;
  marks?: TiptapMark[];
};

type TiptapNode =
  | { type: 'doc'; content: TiptapNode[] }
  | { type: 'paragraph'; content?: TiptapNode[] }
  | { type: 'heading'; attrs: { level: number }; content: TiptapNode[] }
  | { type: 'bulletList'; content: TiptapNode[] }
  | { type: 'orderedList'; attrs?: { start: number }; content: TiptapNode[] }
  | { type: 'listItem'; content: TiptapNode[] }
  | { type: 'blockquote'; content: TiptapNode[] }
  | { type: 'codeBlock'; attrs?: { language: string | null }; content: TiptapNode[] }
  | { type: 'horizontalRule' }
  | { type: 'image'; attrs: { src: string; alt: string; title: string | null } }
  | TiptapTextNode;

// Matches a line that is exclusively a markdown image: ![alt](src)
const BLOCK_IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/;

// Matches inline images within text (for splitting paragraphs)
const INLINE_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

// Matches inline formatting tokens in order of specificity
const INLINE_RE =
  /(\*\*\*(.+?)\*\*\*|___(.+?)___|~~(.+?)~~|\*\*(.+?)\*\*|__(.+?)__|_(.+?)_|\*(.+?)\*|`(.+?)`|\[(.+?)\]\(([^)]+)\))/gs;

function parseInline(text: string): TiptapTextNode[] {
  const nodes: TiptapTextNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  INLINE_RE.lastIndex = 0;

  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > lastIdx) {
      nodes.push({ type: 'text', text: text.slice(lastIdx, m.index) });
    }

    if (m[2] !== undefined || m[3] !== undefined) {
      // ***...*** or ___...___  → bold + italic
      nodes.push({ type: 'text', text: m[2] ?? m[3], marks: [{ type: 'bold' }, { type: 'italic' }] });
    } else if (m[4] !== undefined) {
      // ~~...~~ → strikethrough
      nodes.push({ type: 'text', text: m[4], marks: [{ type: 'strike' }] });
    } else if (m[5] !== undefined || m[6] !== undefined) {
      // **...** or __...__ → bold
      nodes.push({ type: 'text', text: m[5] ?? m[6], marks: [{ type: 'bold' }] });
    } else if (m[7] !== undefined || m[8] !== undefined) {
      // _..._ or *...* → italic
      nodes.push({ type: 'text', text: m[7] ?? m[8], marks: [{ type: 'italic' }] });
    } else if (m[9] !== undefined) {
      // `...` → code
      nodes.push({ type: 'text', text: m[9], marks: [{ type: 'code' }] });
    } else if (m[10] !== undefined && m[11] !== undefined) {
      // [text](url) → link
      nodes.push({
        type: 'text',
        text: m[10],
        marks: [{ type: 'link', attrs: { href: m[11], target: '_blank' } }],
      });
    }

    lastIdx = m.index + m[0].length;
  }

  if (lastIdx < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIdx) });
  }

  return nodes.length > 0 ? nodes : [{ type: 'text', text }];
}

/**
 * Build an image node, resolving the src through imageMap if provided.
 */
function imageNode(alt: string, src: string, imageMap?: Record<string, string>): TiptapNode {
  const resolved = imageMap?.[src] ?? src;
  return { type: 'image', attrs: { src: resolved, alt, title: null } };
}

/**
 * Split a text line that contains inline images into a mix of paragraph
 * content and block image nodes. Returns an array of TiptapNodes.
 */
function splitLineOnImages(line: string, imageMap?: Record<string, string>): TiptapNode[] {
  const result: TiptapNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  INLINE_IMAGE_RE.lastIndex = 0;

  while ((m = INLINE_IMAGE_RE.exec(line)) !== null) {
    const before = line.slice(lastIdx, m.index);
    if (before.trim()) {
      result.push({ type: 'paragraph', content: parseInline(before) });
    }
    result.push(imageNode(m[1], m[2], imageMap));
    lastIdx = m.index + m[0].length;
  }

  const after = line.slice(lastIdx);
  if (after.trim()) {
    result.push({ type: 'paragraph', content: parseInline(after) });
  }

  return result;
}

export function markdownToTiptap(markdown: string, imageMap?: Record<string, string>): TiptapNode {
  const lines = markdown.split('\n');
  const content: TiptapNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Empty line ──────────────────────────────────────────────────────────
    if (line.trim() === '') {
      i++;
      continue;
    }

    // ── Fenced code block ───────────────────────────────────────────────────
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || null;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // closing ```
      content.push({
        type: 'codeBlock',
        attrs: { language: lang },
        content: [{ type: 'text', text: codeLines.join('\n') }],
      });
      continue;
    }

    // ── Standalone image ────────────────────────────────────────────────────
    const imgMatch = line.match(BLOCK_IMAGE_RE);
    if (imgMatch) {
      content.push(imageNode(imgMatch[1], imgMatch[2], imageMap));
      i++;
      continue;
    }

    // ── ATX Heading ─────────────────────────────────────────────────────────
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      content.push({
        type: 'heading',
        attrs: { level: headingMatch[1].length },
        content: parseInline(headingMatch[2].trim()),
      });
      i++;
      continue;
    }

    // ── Setext heading (underline style) ────────────────────────────────────
    if (i + 1 < lines.length && lines[i + 1].match(/^=+\s*$/)) {
      content.push({ type: 'heading', attrs: { level: 1 }, content: parseInline(line.trim()) });
      i += 2;
      continue;
    }
    if (i + 1 < lines.length && lines[i + 1].match(/^-+\s*$/) && lines[i + 1].length >= 2) {
      content.push({ type: 'heading', attrs: { level: 2 }, content: parseInline(line.trim()) });
      i += 2;
      continue;
    }

    // ── Horizontal rule ─────────────────────────────────────────────────────
    if (line.match(/^(\*{3,}|-{3,}|_{3,})\s*$/)) {
      content.push({ type: 'horizontalRule' });
      i++;
      continue;
    }

    // ── Blockquote ──────────────────────────────────────────────────────────
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        quoteLines.push(lines[i].replace(/^> ?/, ''));
        i++;
      }
      const quoteContent = markdownToTiptap(quoteLines.join('\n'), imageMap);
      content.push({ type: 'blockquote', content: (quoteContent as any).content });
      continue;
    }

    // ── Bullet list ─────────────────────────────────────────────────────────
    if (line.match(/^[-*+]\s+/)) {
      const items: TiptapNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*+]\s+/)) {
        const text = lines[i].replace(/^[-*+]\s+/, '');
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInline(text) }],
        });
        i++;
      }
      content.push({ type: 'bulletList', content: items });
      continue;
    }

    // ── Ordered list ────────────────────────────────────────────────────────
    if (line.match(/^\d+[.)]\s+/)) {
      const items: TiptapNode[] = [];
      const startNum = parseInt(line.match(/^(\d+)/)![1], 10);
      while (i < lines.length && lines[i].match(/^\d+[.)]\s+/)) {
        const text = lines[i].replace(/^\d+[.)]\s+/, '');
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInline(text) }],
        });
        i++;
      }
      content.push({ type: 'orderedList', attrs: { start: startNum }, content: items });
      continue;
    }

    // ── Paragraph (collect runs of non-special lines) ───────────────────────
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(BLOCK_IMAGE_RE) &&
      !lines[i].match(/^#{1,6}\s/) &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('> ') &&
      !lines[i].match(/^[-*+]\s+/) &&
      !lines[i].match(/^\d+[.)]\s+/) &&
      !lines[i].match(/^(\*{3,}|-{3,}|_{3,})\s*$/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      const joined = paraLines.join(' ');
      // If the paragraph contains any inline images, split into blocks
      if (INLINE_IMAGE_RE.test(joined)) {
        content.push(...splitLineOnImages(joined, imageMap));
      } else {
        content.push({ type: 'paragraph', content: parseInline(joined) });
      }
    }
  }

  // A Tiptap doc must have at least one block
  if (content.length === 0) {
    content.push({ type: 'paragraph', content: [] });
  }

  return { type: 'doc', content };
}
