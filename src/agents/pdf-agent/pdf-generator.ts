import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import type { GuideContent } from "./content-generator.js";

// Brand palette — warm, professional, readable
const COLORS = {
  primary: "#2C3E50",    // deep navy
  accent: "#E67E22",     // warm orange
  light: "#ECF0F1",      // off-white background blocks
  body: "#2C3E50",       // body text
  muted: "#7F8C8D",      // captions, page numbers
  white: "#FFFFFF",
  divider: "#BDC3C7",
};

const FONTS = {
  heading: "Helvetica-Bold",
  body: "Helvetica",
  bold: "Helvetica-Bold",
  italic: "Helvetica-Oblique",
};

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
      info: {
        Title: content.title,
        Subject: content.subtitle,
        Author: "Expert Guide Series",
        Creator: "PDF Guide Generator",
      },
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    stream.on("finish", resolve);
    stream.on("error", reject);

    renderCoverPage(doc, content);
    renderTableOfContents(doc, content);
    renderIntroduction(doc, content);

    for (let i = 0; i < content.sections.length; i++) {
      renderSection(doc, content.sections[i], i + 1);
    }

    renderQuickTips(doc, content.quickTips);
    renderConclusion(doc, content.conclusion);
    addPageNumbers(doc);

    doc.end();
  });

  return outputPath;
}

function renderCoverPage(doc: PDFKit.PDFDocument, content: GuideContent): void {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Background
  doc.rect(0, 0, pageWidth, pageHeight).fill(COLORS.primary);

  // Accent bar
  doc.rect(0, pageHeight * 0.6, pageWidth, pageHeight * 0.4).fill(COLORS.accent);

  // White content area
  doc.rect(54, 80, pageWidth - 108, pageHeight * 0.55).fill(COLORS.white);

  // Title
  doc
    .fillColor(COLORS.primary)
    .font(FONTS.heading)
    .fontSize(28)
    .text(content.title, 72, 120, {
      width: pageWidth - 144,
      align: "left",
      lineGap: 4,
    });

  // Divider under title
  const titleBottom = doc.y + 12;
  doc
    .moveTo(72, titleBottom)
    .lineTo(pageWidth - 72, titleBottom)
    .strokeColor(COLORS.accent)
    .lineWidth(2)
    .stroke();

  // Subtitle
  doc
    .fillColor(COLORS.muted)
    .font(FONTS.italic)
    .fontSize(14)
    .text(content.subtitle, 72, titleBottom + 20, {
      width: pageWidth - 144,
      align: "left",
    });

  // Target audience badge
  doc
    .fillColor(COLORS.primary)
    .font(FONTS.body)
    .fontSize(11)
    .text(`For: ${content.targetAudience}`, 72, doc.y + 20, {
      width: pageWidth - 144,
    });

  // Bottom white text on accent
  doc
    .fillColor(COLORS.white)
    .font(FONTS.bold)
    .fontSize(12)
    .text("COMPLETE GUIDE SERIES", 72, pageHeight * 0.65, {
      width: pageWidth - 144,
      align: "center",
    });

  doc.addPage();
}

function renderTableOfContents(doc: PDFKit.PDFDocument, content: GuideContent): void {
  doc
    .fillColor(COLORS.primary)
    .font(FONTS.heading)
    .fontSize(22)
    .text("Table of Contents", { align: "left" });

  doc.moveDown(0.5);
  doc
    .moveTo(72, doc.y)
    .lineTo(doc.page.width - 72, doc.y)
    .strokeColor(COLORS.accent)
    .lineWidth(1.5)
    .stroke();
  doc.moveDown(0.8);

  const items = [
    "Introduction",
    ...content.sections.map((s) => s.heading),
    "Quick Tips & Checklist",
    "Conclusion",
  ];

  items.forEach((item, i) => {
    const dots = ".".repeat(50);
    doc
      .fillColor(COLORS.body)
      .font(FONTS.body)
      .fontSize(12)
      .text(`${i + 1}.  ${item}`, { continued: true })
      .fillColor(COLORS.muted)
      .text(` ${dots}`, { continued: true })
      .fillColor(COLORS.muted)
      .text(` ${i + 3}`, { align: "right" });
    doc.moveDown(0.4);
  });

  doc.addPage();
}

function renderIntroduction(doc: PDFKit.PDFDocument, content: GuideContent): void {
  sectionHeader(doc, "Introduction");

  doc
    .fillColor(COLORS.body)
    .font(FONTS.body)
    .fontSize(11.5)
    .lineGap(3)
    .text(content.introduction, { align: "justify" });

  doc.addPage();
}

function renderSection(
  doc: PDFKit.PDFDocument,
  section: { heading: string; content: string; steps?: string[]; tips?: string[] },
  number: number
): void {
  sectionHeader(doc, `${number}. ${section.heading}`);

  doc
    .fillColor(COLORS.body)
    .font(FONTS.body)
    .fontSize(11.5)
    .lineGap(3)
    .text(section.content, { align: "justify" });

  if (section.steps && section.steps.length > 0) {
    doc.moveDown(0.8);
    doc
      .fillColor(COLORS.primary)
      .font(FONTS.bold)
      .fontSize(12)
      .text("Step-by-Step:");
    doc.moveDown(0.3);

    section.steps.forEach((step, i) => {
      const margin = doc.page.margins.left;
      doc
        .fillColor(COLORS.accent)
        .font(FONTS.bold)
        .fontSize(11)
        .text(`Step ${i + 1}`, margin, doc.y, { continued: true, width: 55 })
        .fillColor(COLORS.body)
        .font(FONTS.body)
        .text(`  ${step}`, { width: doc.page.width - margin * 2 - 55 });
      doc.moveDown(0.3);
    });
  }

  if (section.tips && section.tips.length > 0) {
    doc.moveDown(0.6);
    const boxY = doc.y;
    const boxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Light background box for tips
    doc.rect(doc.page.margins.left, boxY, boxWidth, 14).fill(COLORS.light);

    doc
      .fillColor(COLORS.accent)
      .font(FONTS.bold)
      .fontSize(10)
      .text("  PRO TIPS:", doc.page.margins.left, boxY + 2, { width: boxWidth });

    doc.moveDown(0.5);
    section.tips.forEach((tip) => {
      doc
        .fillColor(COLORS.body)
        .font(FONTS.italic)
        .fontSize(11)
        .text(`  ✓  ${tip}`, { width: boxWidth });
      doc.moveDown(0.25);
    });
  }

  doc.addPage();
}

function renderQuickTips(doc: PDFKit.PDFDocument, tips: string[]): void {
  sectionHeader(doc, "Quick Tips & Checklist");

  doc
    .fillColor(COLORS.muted)
    .font(FONTS.italic)
    .fontSize(11)
    .text("Use this checklist as a quick reference guide you can return to anytime.");

  doc.moveDown(0.8);

  tips.forEach((tip, i) => {
    const isEven = i % 2 === 0;
    if (isEven) {
      const boxWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.rect(doc.page.margins.left, doc.y, boxWidth, 22).fill(COLORS.light);
    }
    doc
      .fillColor(COLORS.primary)
      .font(FONTS.body)
      .fontSize(11)
      .text(`  ☐  ${tip}`, doc.page.margins.left, isEven ? doc.y - 16 : doc.y, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 10,
      });
    doc.moveDown(isEven ? 0.15 : 0.35);
  });

  doc.addPage();
}

function renderConclusion(doc: PDFKit.PDFDocument, conclusion: string): void {
  sectionHeader(doc, "Conclusion");

  doc
    .fillColor(COLORS.body)
    .font(FONTS.body)
    .fontSize(11.5)
    .lineGap(3)
    .text(conclusion, { align: "justify" });

  doc.moveDown(2);

  // Closing motivational box
  const boxWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.rect(doc.page.margins.left, doc.y, boxWidth, 60).fill(COLORS.accent);
  doc
    .fillColor(COLORS.white)
    .font(FONTS.bold)
    .fontSize(14)
    .text("You've got this! 🌟", doc.page.margins.left, doc.y - 50, {
      width: boxWidth,
      align: "center",
    });
  doc
    .fillColor(COLORS.white)
    .font(FONTS.body)
    .fontSize(10)
    .text("Thank you for downloading this guide. Start today — one step at a time.", {
      width: boxWidth,
      align: "center",
    });
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string): void {
  doc
    .fillColor(COLORS.primary)
    .font(FONTS.heading)
    .fontSize(20)
    .text(title, { align: "left" });

  doc.moveDown(0.3);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor(COLORS.accent)
    .lineWidth(1.5)
    .stroke();
  doc.moveDown(0.8);
}

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
        { align: "center", width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
      );
  }
}
