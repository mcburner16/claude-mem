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
  | TiptapTextNode;

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

export function markdownToTiptap(markdown: string): TiptapNode {
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
      const quoteContent = markdownToTiptap(quoteLines.join('\n'));
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
      // Join soft-wrapped lines with a space; double-space = explicit line break
      content.push({
        type: 'paragraph',
        content: parseInline(paraLines.join(' ')),
      });
    }
  }

  // A Tiptap doc must have at least one block
  if (content.length === 0) {
    content.push({ type: 'paragraph', content: [] });
  }

  return { type: 'doc', content };
}
