import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import type {
  GuideContent,
  GuideSection,
  RecipeCard,
  Worksheet,
  WorksheetRow,
  ShoppingCategory,
  QuickReferenceTable,
} from "./content-generator.js";

// Brand palette — warm, professional, readable
const COLORS = {
  primary: "#2C3E50",   // deep navy
  accent: "#E67E22",    // warm orange
  light: "#ECF0F1",     // off-white background blocks
  lightGray: "#D5D8DC", // disclaimer / table borders
  body: "#2C3E50",      // body text
  muted: "#7F8C8D",     // captions, page numbers
  white: "#FFFFFF",
  divider: "#BDC3C7",
};

const FONTS = {
  heading: "Helvetica-Bold",
  body: "Helvetica",
  bold: "Helvetica-Bold",
  italic: "Helvetica-Oblique",
};

// Strip/replace characters that cause PDF encoding artifacts.
// Replaces smart quotes, em-dashes, and other non-ASCII with safe equivalents.
function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    // Smart quotes → straight quotes
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    // Em dash / en dash → hyphen
    .replace(/[–—]/g, "-")
    // Ellipsis → three dots
    .replace(/…/g, "...")
    // Bullet variants → hyphen
    .replace(/[•‣◦⁃∙]/g, "-")
    // Non-breaking space → regular space
    .replace(/ /g, " ")
    // Trademark, registered, copyright — keep as ASCII equivalents
    .replace(/™/g, "(TM)")
    .replace(/®/g, "(R)")
    .replace(/©/g, "(C)")
    // Strip any remaining non-ASCII (> 0x7E) that pdfkit can't handle
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

export async function generatePdf(
  content: GuideContent,
  outputDir: string
): Promise<string> {
  await fs.promises.mkdir(outputDir, { recursive: true });

  const safeTitle = content.title
    .replace(/[^a-z0-9\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60);

  const filename = `${safeTitle}-${Date.now()}.pdf`;
  const outputPath = path.join(outputDir, filename);

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      bufferPages: true,
      info: {
        Title: sanitizeText(content.title),
        Subject: sanitizeText(content.subtitle),
        Author: "Practical Toolkit Series",
        Creator: "PDF Guide Generator",
      },
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    stream.on("finish", resolve);
    stream.on("error", reject);

    // ── Cover ──────────────────────────────────────────────────────────────
    renderCoverPage(doc, content);

    // ── Table of Contents ─────────────────────────────────────────────────
    renderTableOfContents(doc, content);

    // ── Introduction ──────────────────────────────────────────────────────
    renderIntroduction(doc, content);

    // ── Body Sections ─────────────────────────────────────────────────────
    for (let i = 0; i < content.sections.length; i++) {
      renderSection(doc, content.sections[i], i + 1);
    }

    // ── Recipes (food niches) ─────────────────────────────────────────────
    if (content.recipes && content.recipes.length > 0) {
      renderRecipesSection(doc, content.recipes);
    }

    // ── Worksheets ────────────────────────────────────────────────────────
    if (content.worksheets && content.worksheets.length > 0) {
      for (const ws of content.worksheets) {
        renderWorksheet(doc, ws);
      }
    }

    // ── Shopping List ─────────────────────────────────────────────────────
    if (content.shoppingList) {
      renderShoppingList(doc, content.shoppingList);
    }

    // ── Quick Reference Tables ────────────────────────────────────────────
    if (content.quickReferenceTables && content.quickReferenceTables.length > 0) {
      renderQuickReferenceTables(doc, content.quickReferenceTables);
    }

    // ── Checklist ─────────────────────────────────────────────────────────
    if (content.checklist && content.checklist.length > 0) {
      renderChecklist(doc, content.checklist);
    }

    // ── Disclaimer ────────────────────────────────────────────────────────
    if (content.disclaimer) {
      renderDisclaimer(doc, content.disclaimer);
    }

    // ── Conclusion ────────────────────────────────────────────────────────
    renderConclusion(doc, content.conclusion);

    // ── Page Numbers ──────────────────────────────────────────────────────
    addPageNumbers(doc);

    doc.end();
  });

  return outputPath;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pageWidth(doc: PDFKit.PDFDocument): number {
  return doc.page.width;
}

function contentWidth(doc: PDFKit.PDFDocument): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function leftMargin(doc: PDFKit.PDFDocument): number {
  return doc.page.margins.left;
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string): void {
  doc
    .fillColor(COLORS.primary)
    .font(FONTS.heading)
    .fontSize(20)
    .text(sanitizeText(title), { align: "left" });

  doc.moveDown(0.3);
  doc
    .moveTo(leftMargin(doc), doc.y)
    .lineTo(pageWidth(doc) - doc.page.margins.right, doc.y)
    .strokeColor(COLORS.accent)
    .lineWidth(1.5)
    .stroke();
  doc.moveDown(0.8);
}

function subHeader(doc: PDFKit.PDFDocument, title: string): void {
  doc
    .fillColor(COLORS.accent)
    .font(FONTS.bold)
    .fontSize(13)
    .text(sanitizeText(title), { align: "left" });
  doc.moveDown(0.3);
}

// ─── Cover Page ─────────────────────────────────────────────────────────────

function renderCoverPage(doc: PDFKit.PDFDocument, content: GuideContent): void {
  const pw = pageWidth(doc);
  const ph = doc.page.height;

  // Background
  doc.rect(0, 0, pw, ph).fill(COLORS.primary);

  // Accent bar (bottom 40%)
  doc.rect(0, ph * 0.6, pw, ph * 0.4).fill(COLORS.accent);

  // White content area
  doc.rect(54, 80, pw - 108, ph * 0.55).fill(COLORS.white);

  // Title
  doc
    .fillColor(COLORS.primary)
    .font(FONTS.heading)
    .fontSize(28)
    .text(sanitizeText(content.title), 72, 120, {
      width: pw - 144,
      align: "left",
      lineGap: 4,
    });

  // Divider under title
  const titleBottom = doc.y + 12;
  doc
    .moveTo(72, titleBottom)
    .lineTo(pw - 72, titleBottom)
    .strokeColor(COLORS.accent)
    .lineWidth(2)
    .stroke();

  // Subtitle
  doc
    .fillColor(COLORS.muted)
    .font(FONTS.italic)
    .fontSize(14)
    .text(sanitizeText(content.subtitle), 72, titleBottom + 20, {
      width: pw - 144,
      align: "left",
    });

  // Target audience
  doc
    .fillColor(COLORS.primary)
    .font(FONTS.body)
    .fontSize(11)
    .text(`For: ${sanitizeText(content.targetAudience)}`, 72, doc.y + 20, {
      width: pw - 144,
    });

  // What's inside summary on the accent band
  const insideY = ph * 0.63;
  doc
    .fillColor(COLORS.white)
    .font(FONTS.bold)
    .fontSize(12)
    .text("PRACTICAL TOOLKIT SERIES", 72, insideY, {
      width: pw - 144,
      align: "center",
    });

  const parts: string[] = [];
  if (content.recipes && content.recipes.length > 0)
    parts.push(`${content.recipes.length} Recipe Cards`);
  if (content.worksheets && content.worksheets.length > 0)
    parts.push(`${content.worksheets.length} Printable Worksheets`);
  if (content.shoppingList)
    parts.push("Shopping List");
  if (content.quickReferenceTables && content.quickReferenceTables.length > 0)
    parts.push(`${content.quickReferenceTables.length} Quick Reference Table${content.quickReferenceTables.length > 1 ? "s" : ""}`);

  if (parts.length > 0) {
    doc
      .fillColor(COLORS.white)
      .font(FONTS.body)
      .fontSize(10)
      .text(`Includes: ${parts.join(" | ")}`, 72, doc.y + 8, {
        width: pw - 144,
        align: "center",
      });
  }

  doc.addPage();
}

// ─── Table of Contents ───────────────────────────────────────────────────────

function renderTableOfContents(doc: PDFKit.PDFDocument, content: GuideContent): void {
  doc
    .fillColor(COLORS.primary)
    .font(FONTS.heading)
    .fontSize(22)
    .text("Table of Contents", { align: "left" });

  doc.moveDown(0.5);
  doc
    .moveTo(leftMargin(doc), doc.y)
    .lineTo(pageWidth(doc) - doc.page.margins.right, doc.y)
    .strokeColor(COLORS.accent)
    .lineWidth(1.5)
    .stroke();
  doc.moveDown(0.8);

  const items: string[] = ["Introduction"];
  for (const s of content.sections) items.push(sanitizeText(s.heading));
  if (content.recipes && content.recipes.length > 0) items.push("Recipe Cards");
  if (content.worksheets && content.worksheets.length > 0) items.push("Printable Worksheets");
  if (content.shoppingList) items.push("Shopping List");
  if (content.quickReferenceTables && content.quickReferenceTables.length > 0) items.push("Quick Reference Tables");
  if (content.checklist && content.checklist.length > 0) items.push("Action Checklist");
  if (content.disclaimer) items.push("Disclaimer");
  items.push("Conclusion");

  items.forEach((item, i) => {
    doc
      .fillColor(COLORS.body)
      .font(FONTS.body)
      .fontSize(12)
      .text(`${i + 1}.  ${item}`, { continued: true })
      .fillColor(COLORS.muted)
      .text(` `, { continued: true })
      .fillColor(COLORS.muted)
      .text(` ${i + 3}`, { align: "right" });
    doc.moveDown(0.4);
  });

  doc.addPage();
}

// ─── Introduction ────────────────────────────────────────────────────────────

function renderIntroduction(doc: PDFKit.PDFDocument, content: GuideContent): void {
  sectionHeader(doc, "Introduction");

  doc
    .fillColor(COLORS.body)
    .font(FONTS.body)
    .fontSize(11.5)
    .lineGap(3)
    .text(sanitizeText(content.introduction), { align: "justify" });

  doc.addPage();
}

// ─── Body Sections ───────────────────────────────────────────────────────────

function renderSection(
  doc: PDFKit.PDFDocument,
  section: GuideSection,
  number: number
): void {
  sectionHeader(doc, `${number}. ${section.heading}`);

  doc
    .fillColor(COLORS.body)
    .font(FONTS.body)
    .fontSize(11.5)
    .lineGap(3)
    .text(sanitizeText(section.content), { align: "justify" });

  if (section.steps && section.steps.length > 0) {
    doc.moveDown(0.8);
    doc
      .fillColor(COLORS.primary)
      .font(FONTS.bold)
      .fontSize(12)
      .text("Step-by-Step:");
    doc.moveDown(0.3);

    section.steps.forEach((step, i) => {
      const lm = leftMargin(doc);
      doc
        .fillColor(COLORS.accent)
        .font(FONTS.bold)
        .fontSize(11)
        .text(`Step ${i + 1}`, lm, doc.y, { continued: true, width: 55 })
        .fillColor(COLORS.body)
        .font(FONTS.body)
        .text(`  ${sanitizeText(step)}`, { width: contentWidth(doc) - 55 });
      doc.moveDown(0.3);
    });
  }

  if (section.tips && section.tips.length > 0) {
    doc.moveDown(0.6);
    const boxY = doc.y;
    const bw = contentWidth(doc);

    doc.rect(leftMargin(doc), boxY, bw, 14).fill(COLORS.light);

    doc
      .fillColor(COLORS.accent)
      .font(FONTS.bold)
      .fontSize(10)
      .text("  TIPS:", leftMargin(doc), boxY + 2, { width: bw });

    doc.moveDown(0.5);
    section.tips.forEach((tip) => {
      doc
        .fillColor(COLORS.body)
        .font(FONTS.italic)
        .fontSize(11)
        .text(`  - ${sanitizeText(tip)}`, { width: bw });
      doc.moveDown(0.25);
    });
  }

  doc.addPage();
}

// ─── Recipe Cards ─────────────────────────────────────────────────────────────

function renderRecipesSection(doc: PDFKit.PDFDocument, recipes: RecipeCard[]): void {
  sectionHeader(doc, "Recipe Cards");

  doc
    .fillColor(COLORS.muted)
    .font(FONTS.italic)
    .fontSize(11)
    .text("Complete recipes ready to cook. Print individual cards and keep in your kitchen binder.", {
      align: "left",
    });

  doc.moveDown(1);

  for (let i = 0; i < recipes.length; i++) {
    renderRecipeCard(doc, recipes[i]);
    if (i < recipes.length - 1) {
      // Check if there's enough room for the next card header (at least 200pt)
      if (doc.y > doc.page.height - doc.page.margins.bottom - 200) {
        doc.addPage();
      } else {
        doc.moveDown(1.5);
        // Thin divider between recipes on same page
        doc
          .moveTo(leftMargin(doc), doc.y)
          .lineTo(pageWidth(doc) - doc.page.margins.right, doc.y)
          .strokeColor(COLORS.divider)
          .lineWidth(0.5)
          .stroke();
        doc.moveDown(1);
      }
    }
  }

  doc.addPage();
}

function renderRecipeCard(doc: PDFKit.PDFDocument, recipe: RecipeCard): void {
  const lm = leftMargin(doc);
  const bw = contentWidth(doc);

  // Recipe name bar
  doc.rect(lm, doc.y, bw, 28).fill(COLORS.primary);
  doc
    .fillColor(COLORS.white)
    .font(FONTS.bold)
    .fontSize(14)
    .text(sanitizeText(recipe.name), lm + 8, doc.y - 22, { width: bw - 16 });

  doc.moveDown(0.4);

  // Meta row: servings | prep | cook | cost
  const metaParts: string[] = [];
  if (recipe.servings) metaParts.push(`Serves: ${sanitizeText(recipe.servings)}`);
  if (recipe.prepTime) metaParts.push(`Prep: ${sanitizeText(recipe.prepTime)}`);
  if (recipe.cookTime) metaParts.push(`Cook: ${sanitizeText(recipe.cookTime)}`);
  if (recipe.estimatedCost) metaParts.push(`Est. Cost: ${sanitizeText(recipe.estimatedCost)}`);

  const metaY = doc.y;
  doc.rect(lm, metaY, bw, 18).fill(COLORS.light);
  doc
    .fillColor(COLORS.muted)
    .font(FONTS.body)
    .fontSize(10)
    .text(metaParts.join("   |   "), lm + 6, metaY + 4, { width: bw - 12 });

  doc.moveDown(0.6);

  // Two-column layout: ingredients left, instructions right
  const colGap = 12;
  const ingColW = Math.floor(bw * 0.38);
  const instColW = bw - ingColW - colGap;
  const colStartY = doc.y;

  // Ingredients column
  doc
    .fillColor(COLORS.accent)
    .font(FONTS.bold)
    .fontSize(11)
    .text("Ingredients", lm, colStartY, { width: ingColW });

  doc.moveDown(0.3);
  const ingStartY = doc.y;

  recipe.ingredients.forEach((ing) => {
    doc
      .fillColor(COLORS.body)
      .font(FONTS.body)
      .fontSize(10)
      .text(`- ${sanitizeText(ing)}`, lm, doc.y, { width: ingColW });
  });

  const ingEndY = doc.y;

  // Instructions column
  doc
    .fillColor(COLORS.accent)
    .font(FONTS.bold)
    .fontSize(11)
    .text("Instructions", lm + ingColW + colGap, colStartY, { width: instColW });

  // We need to manually track Y for the right column
  let instY = colStartY + 16; // below "Instructions" label

  recipe.instructions.forEach((step, i) => {
    doc
      .fillColor(COLORS.primary)
      .font(FONTS.bold)
      .fontSize(10)
      .text(`${i + 1}.`, lm + ingColW + colGap, instY, {
        continued: true,
        width: 18,
      })
      .fillColor(COLORS.body)
      .font(FONTS.body)
      .text(` ${sanitizeText(step)}`, {
        width: instColW - 18,
      });
    instY = doc.y + 2;
  });

  // Move to whichever column ended lower
  doc.y = Math.max(ingEndY, instY) + 6;

  // Freezer instructions
  if (recipe.freezerInstructions) {
    const fyStart = doc.y;
    const fyH = 14;
    doc.rect(lm, fyStart, bw, fyH).fill(COLORS.light);
    doc
      .fillColor(COLORS.primary)
      .font(FONTS.bold)
      .fontSize(9)
      .text("FREEZER: ", lm + 6, fyStart + 3, { continued: true })
      .font(FONTS.body)
      .text(sanitizeText(recipe.freezerInstructions), { width: bw - 60 });
    doc.moveDown(0.3);
  }

  // Notes
  if (recipe.notes) {
    doc
      .fillColor(COLORS.muted)
      .font(FONTS.italic)
      .fontSize(9.5)
      .text(`Note: ${sanitizeText(recipe.notes)}`, lm, doc.y, { width: bw });
    doc.moveDown(0.2);
  }
}

// ─── Worksheets ───────────────────────────────────────────────────────────────

function renderWorksheet(doc: PDFKit.PDFDocument, ws: Worksheet): void {
  // Each worksheet gets its own page — it's a printable tool
  doc.addPage();

  const lm = leftMargin(doc);
  const bw = contentWidth(doc);

  // Header bar
  doc.rect(lm, doc.y, bw, 36).fill(COLORS.primary);
  doc
    .fillColor(COLORS.white)
    .font(FONTS.heading)
    .fontSize(16)
    .text(sanitizeText(ws.title), lm + 10, doc.y - 30, { width: bw - 20 });

  doc.moveDown(0.3);

  if (ws.subtitle) {
    doc
      .fillColor(COLORS.muted)
      .font(FONTS.italic)
      .fontSize(10)
      .text(sanitizeText(ws.subtitle), lm, doc.y, { width: bw });
    doc.moveDown(0.5);
  }

  doc.moveDown(0.3);

  // Render rows
  ws.rows.forEach((row: WorksheetRow) => {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 50) {
      doc.addPage();
    }

    renderWorksheetRow(doc, row, lm, bw);
    doc.moveDown(0.5);
  });
}

function renderWorksheetRow(
  doc: PDFKit.PDFDocument,
  row: WorksheetRow,
  lm: number,
  bw: number
): void {
  const label = sanitizeText(row.label);

  if (row.type === "checkbox") {
    // Checkbox: small square + label on same line
    const boxSize = 12;
    const rowY = doc.y;
    doc
      .rect(lm, rowY, boxSize, boxSize)
      .strokeColor(COLORS.primary)
      .lineWidth(1)
      .stroke();
    doc
      .fillColor(COLORS.body)
      .font(FONTS.body)
      .fontSize(11)
      .text(label, lm + boxSize + 8, rowY, { width: bw - boxSize - 8 });
  } else if (row.type === "box") {
    // Box: label above, large empty rectangle below
    doc
      .fillColor(COLORS.primary)
      .font(FONTS.bold)
      .fontSize(10)
      .text(label, lm, doc.y, { width: bw });
    doc.moveDown(0.2);
    const boxH = 48;
    doc
      .rect(lm, doc.y, bw, boxH)
      .strokeColor(COLORS.divider)
      .lineWidth(1)
      .stroke();
    doc.y = doc.y + boxH + 4;
  } else {
    // Line: label + fill-in line on same row
    doc
      .fillColor(COLORS.primary)
      .font(FONTS.bold)
      .fontSize(10.5)
      .text(label, lm, doc.y, { continued: true, width: 180 });

    const lineStartX = lm + 185;
    const lineY = doc.y + 2;
    doc
      .moveTo(lineStartX, lineY)
      .lineTo(lm + bw, lineY)
      .strokeColor(COLORS.divider)
      .lineWidth(0.75)
      .stroke();

    // Advance Y past the line
    doc.y = lineY + 6;
  }
}

// ─── Shopping List ────────────────────────────────────────────────────────────

function renderShoppingList(
  doc: PDFKit.PDFDocument,
  shoppingList: { categories: ShoppingCategory[]; totalEstimate?: string }
): void {
  doc.addPage();
  sectionHeader(doc, "Shopping List");

  const lm = leftMargin(doc);
  const bw = contentWidth(doc);

  // Three columns: Item | Qty | Est. Cost
  const col1W = Math.floor(bw * 0.50);
  const col2W = Math.floor(bw * 0.22);
  const col3W = bw - col1W - col2W;

  for (const cat of shoppingList.categories) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 100) {
      doc.addPage();
    }

    // Category header
    doc.rect(lm, doc.y, bw, 20).fill(COLORS.accent);
    doc
      .fillColor(COLORS.white)
      .font(FONTS.bold)
      .fontSize(11)
      .text(sanitizeText(cat.category), lm + 6, doc.y - 15, { width: bw - 12 });
    doc.moveDown(0.15);

    // Column headers
    const hdrY = doc.y;
    doc.rect(lm, hdrY, bw, 16).fill(COLORS.light);
    doc
      .fillColor(COLORS.muted)
      .font(FONTS.bold)
      .fontSize(9)
      .text("ITEM", lm + 20, hdrY + 3, { width: col1W - 20 })
      .text("QTY", lm + col1W, hdrY + 3, { width: col2W })
      .text("EST. COST", lm + col1W + col2W, hdrY + 3, { width: col3W });
    doc.moveDown(0.1);

    // Items
    cat.items.forEach((item, idx) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
      }

      const rowY = doc.y;
      if (idx % 2 === 0) {
        doc.rect(lm, rowY, bw, 18).fill(COLORS.white);
      } else {
        doc.rect(lm, rowY, bw, 18).fill(COLORS.light);
      }

      // Checkbox
      doc
        .rect(lm + 4, rowY + 4, 10, 10)
        .strokeColor(COLORS.muted)
        .lineWidth(0.75)
        .stroke();

      doc
        .fillColor(COLORS.body)
        .font(FONTS.body)
        .fontSize(10)
        .text(sanitizeText(item.item), lm + 20, rowY + 4, { width: col1W - 20 })
        .text(sanitizeText(item.qty), lm + col1W, rowY + 4, { width: col2W })
        .text(sanitizeText(item.approxCost ?? ""), lm + col1W + col2W, rowY + 4, { width: col3W });

      doc.y = rowY + 20;
    });

    doc.moveDown(0.6);
  }

  // Total estimate
  if (shoppingList.totalEstimate) {
    doc.moveDown(0.5);
    const totY = doc.y;
    doc.rect(lm, totY, bw, 24).fill(COLORS.primary);
    doc
      .fillColor(COLORS.white)
      .font(FONTS.bold)
      .fontSize(12)
      .text(
        `Estimated Total: ${sanitizeText(shoppingList.totalEstimate)}`,
        lm + 8,
        totY + 6,
        { width: bw - 16, align: "right" }
      );
    doc.y = totY + 30;
  }

  doc.addPage();
}

// ─── Quick Reference Tables ───────────────────────────────────────────────────

function renderQuickReferenceTables(
  doc: PDFKit.PDFDocument,
  tables: QuickReferenceTable[]
): void {
  sectionHeader(doc, "Quick Reference Tables");

  doc
    .fillColor(COLORS.muted)
    .font(FONTS.italic)
    .fontSize(10)
    .text("Print and keep these tables handy for quick lookups.", { align: "left" });

  doc.moveDown(0.8);

  for (let t = 0; t < tables.length; t++) {
    if (t > 0) {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 200) {
        doc.addPage();
      } else {
        doc.moveDown(1.5);
      }
    }
    renderSingleTable(doc, tables[t]);
  }

  doc.addPage();
}

function renderSingleTable(doc: PDFKit.PDFDocument, table: QuickReferenceTable): void {
  const lm = leftMargin(doc);
  const bw = contentWidth(doc);

  subHeader(doc, sanitizeText(table.title));

  if (table.headers.length === 0) return;

  const colW = Math.floor(bw / table.headers.length);

  // Header row
  const hdrY = doc.y;
  doc.rect(lm, hdrY, bw, 20).fill(COLORS.primary);
  table.headers.forEach((hdr, ci) => {
    doc
      .fillColor(COLORS.white)
      .font(FONTS.bold)
      .fontSize(10)
      .text(sanitizeText(hdr), lm + ci * colW + 4, hdrY + 5, {
        width: colW - 8,
      });
  });
  doc.y = hdrY + 22;

  // Data rows
  table.rows.forEach((row, ri) => {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 30) {
      doc.addPage();
    }

    const rowY = doc.y;
    const rowH = 18;
    const bg = ri % 2 === 0 ? COLORS.light : COLORS.white;
    doc.rect(lm, rowY, bw, rowH).fill(bg);

    // Row borders
    doc
      .rect(lm, rowY, bw, rowH)
      .strokeColor(COLORS.divider)
      .lineWidth(0.5)
      .stroke();

    row.forEach((cell, ci) => {
      doc
        .fillColor(COLORS.body)
        .font(FONTS.body)
        .fontSize(10)
        .text(sanitizeText(cell), lm + ci * colW + 4, rowY + 4, {
          width: colW - 8,
        });
    });

    doc.y = rowY + rowH;
  });
}

// ─── Checklist ────────────────────────────────────────────────────────────────

function renderChecklist(doc: PDFKit.PDFDocument, checklist: string[]): void {
  sectionHeader(doc, "Action Checklist");

  doc
    .fillColor(COLORS.muted)
    .font(FONTS.italic)
    .fontSize(11)
    .text("Work through these action items to put this toolkit into practice.", {
      align: "left",
    });

  doc.moveDown(0.8);

  const lm = leftMargin(doc);
  const bw = contentWidth(doc);

  checklist.forEach((item, i) => {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 30) {
      doc.addPage();
    }

    const isEven = i % 2 === 0;
    const rowY = doc.y;
    const rowH = 22;

    doc.rect(lm, rowY, bw, rowH).fill(isEven ? COLORS.light : COLORS.white);

    // Checkbox square
    doc
      .rect(lm + 6, rowY + 5, 12, 12)
      .strokeColor(COLORS.primary)
      .lineWidth(1)
      .stroke();

    doc
      .fillColor(COLORS.body)
      .font(FONTS.body)
      .fontSize(11)
      .text(sanitizeText(item), lm + 24, rowY + 6, { width: bw - 28 });

    doc.y = rowY + rowH + 2;
  });

  doc.addPage();
}

// ─── Disclaimer ───────────────────────────────────────────────────────────────

function renderDisclaimer(doc: PDFKit.PDFDocument, disclaimer: string): void {
  const lm = leftMargin(doc);
  const bw = contentWidth(doc);

  // Estimate height: ~15pt per line, ~70 chars per line at this font size
  const estLines = Math.ceil(sanitizeText(disclaimer).length / 70);
  const boxH = Math.max(60, estLines * 15 + 24);

  if (doc.y > doc.page.height - doc.page.margins.bottom - boxH - 20) {
    doc.addPage();
  }

  doc.moveDown(0.5);
  const boxY = doc.y;

  doc.rect(lm, boxY, bw, boxH).fill(COLORS.lightGray);

  doc
    .fillColor(COLORS.primary)
    .font(FONTS.bold)
    .fontSize(10)
    .text("DISCLAIMER", lm + 10, boxY + 8, { width: bw - 20 });

  doc
    .fillColor(COLORS.body)
    .font(FONTS.italic)
    .fontSize(9.5)
    .text(sanitizeText(disclaimer), lm + 10, boxY + 22, {
      width: bw - 20,
    });

  doc.y = boxY + boxH + 12;
  doc.addPage();
}

// ─── Conclusion ───────────────────────────────────────────────────────────────

function renderConclusion(doc: PDFKit.PDFDocument, conclusion: string): void {
  sectionHeader(doc, "Conclusion");

  doc
    .fillColor(COLORS.body)
    .font(FONTS.body)
    .fontSize(11.5)
    .lineGap(3)
    .text(sanitizeText(conclusion), { align: "justify" });

  doc.moveDown(2);

  // Closing motivational box
  const lm = leftMargin(doc);
  const bw = contentWidth(doc);

  if (doc.y > doc.page.height - doc.page.margins.bottom - 80) {
    doc.addPage();
  }

  doc.rect(lm, doc.y, bw, 60).fill(COLORS.accent);
  doc
    .fillColor(COLORS.white)
    .font(FONTS.bold)
    .fontSize(14)
    .text("You've got this!", lm, doc.y - 50, {
      width: bw,
      align: "center",
    });
  doc
    .fillColor(COLORS.white)
    .font(FONTS.body)
    .fontSize(10)
    .text("Thank you for downloading this toolkit. Start today - one step at a time.", {
      width: bw,
      align: "center",
    });
}

// ─── Page Numbers ─────────────────────────────────────────────────────────────

function addPageNumbers(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    if (i === 0) continue; // skip cover

    doc
      .fillColor(COLORS.muted)
      .font(FONTS.body)
      .fontSize(9)
      .text(
        `Page ${i + 1}`,
        doc.page.margins.left,
        doc.page.height - doc.page.margins.bottom + 10,
        {
          align: "center",
          width: pageWidth(doc) - doc.page.margins.left - doc.page.margins.right,
        }
      );
  }
}
