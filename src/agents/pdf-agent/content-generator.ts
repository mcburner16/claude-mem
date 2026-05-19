import Anthropic from "@anthropic-ai/sdk";
import type { TopicEntry } from "./topic-generator.js";

export interface RecipeCard {
  name: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  estimatedCost?: string;
  ingredients: string[]; // e.g. "1 lb ground beef", "2 cans diced tomatoes"
  instructions: string[]; // numbered steps
  freezerInstructions?: string;
  notes?: string;
}

export interface WorksheetRow {
  label: string;
  type: "line" | "box" | "checkbox"; // line = fill-in line, box = small box, checkbox = checklist item
}

export interface Worksheet {
  title: string;
  subtitle?: string;
  rows: WorksheetRow[];
}

export interface ShoppingListItem {
  item: string;
  qty: string;
  approxCost?: string;
}

export interface ShoppingCategory {
  category: string; // "Produce", "Proteins", etc.
  items: ShoppingListItem[];
}

export interface QuickReferenceTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface GuideSection {
  heading: string;
  content: string;
  steps?: string[];
  tips?: string[];
}

export interface GuideContent {
  title: string;
  subtitle: string;
  targetAudience: string;
  introduction: string;
  sections: GuideSection[];
  recipes: RecipeCard[];
  worksheets: Worksheet[];
  shoppingList?: { categories: ShoppingCategory[]; totalEstimate?: string };
  quickReferenceTables: QuickReferenceTable[];
  checklist: string[]; // 10-15 actual checkbox items
  disclaimer: string;
  conclusion: string;
  etsyDescription: string;
  etsyTags: string[];
}

// Detect whether the topic is food/cooking/meal related
function isFoodNiche(topic: TopicEntry): boolean {
  const foodKeywords = [
    "meal", "food", "cook", "recipe", "baking", "bread", "sourdough",
    "nutrition", "diet", "eating", "kitchen", "ingredient", "dinner",
    "lunch", "breakfast", "snack", "grocery", "budget meal", "freezer meal",
  ];
  const searchText = (topic.title + " " + topic.subtitle + " " + topic.keyPoints.join(" ")).toLowerCase();
  return foodKeywords.some((kw) => searchText.includes(kw));
}

export async function generateGuideContent(
  client: Anthropic,
  topic: TopicEntry
): Promise<GuideContent> {
  const isFood = isFoodNiche(topic);

  const recipeInstruction = isFood
    ? `
RECIPES (REQUIRED for food/cooking/meal topics):
Generate 6-8 complete recipe cards. Each recipe MUST include:
- name, servings, prepTime, cookTime, estimatedCost
- ingredients: full list with exact quantities (e.g. "1 lb (450g) ground beef", "2 cans (14.5 oz) diced tomatoes")
- instructions: 5-10 numbered steps written clearly enough for a beginner
- freezerInstructions if the dish freezes well
- notes (optional): substitutions, dietary variants

Do NOT write descriptions of recipes — write the actual recipes with real quantities.`
    : `
RECIPES: Generate an empty array [] — this topic is not food/cooking related.`;

  const prompt = `You are creating a practical, print-ready PDF toolkit for Etsy buyers. This must deliver REAL, USABLE content — not descriptions of content.

Topic: ${topic.title}
Subtitle: ${topic.subtitle}
Target Audience: ${topic.targetAudience}
Key Points: ${topic.keyPoints.join(", ")}

STRICT RULES:
- NEVER use first-person personal history claims: no "I've taught thousands...", "In my experience...", "My method...", "Over the years I've...", "I've helped...", "As a professional who..."
- NEVER use unsupported statistics without hedging language (use "research suggests", "many families find", "commonly reported" instead of bare percentages)
- Title framing: use "Starter Kit", "System", "Toolkit", "Planner" — NOT "Complete Guide to..."
- Honest framing: "Designed for...", "Based on common principles..." not fake credentials
- Write content a buyer can ACT ON immediately — worksheets to print and fill in, recipes to cook tonight, tables to reference

${recipeInstruction}

WORKSHEETS (REQUIRED — generate 3-5):
Each worksheet is a printable fill-in page. Generate STRUCTURED DATA — not a description of a worksheet.
Each worksheet needs:
- title: short descriptive name (e.g. "Weekly Meal Planner", "Monthly Budget Tracker")
- subtitle: one-sentence purpose (optional)
- rows: 10-20 labeled fields with type "line" (fill-in line), "box" (small checkbox or tick box), or "checkbox" (checklist item)

Example worksheet rows:
{"label": "Week of:", "type": "line"}
{"label": "Monday dinner:", "type": "line"}
{"label": "Estimated grocery budget:", "type": "line"}
{"label": "Pantry items to use up:", "type": "line"}
{"label": "Notes:", "type": "box"}
{"label": "Did I stay on budget?", "type": "checkbox"}

SHOPPING LIST (generate if applicable to the topic):
Categorize into sections: Produce, Proteins, Pantry, Dairy, Frozen, Other.
Each item needs: item name, qty (e.g. "2 lbs", "1 bunch", "1 can"), approxCost (e.g. "$2.49").
Include a totalEstimate.

QUICK REFERENCE TABLES (generate 1-2):
Actual tables with headers and data rows — something a buyer would tape to their fridge or keep in a binder.
Examples: "Freezer life by food category", "Portion sizes by age group", "Plant watering frequency by type", "Budget breakdown by category"

CHECKLIST (generate 10-15 items):
Real action items the buyer can check off — not tips, not advice, actual TO-DO checkbox items.
Example: "Clear out freezer and take inventory", "Download and print the weekly planner", "Set a grocery budget for this week"

DISCLAIMER:
Write a 2-3 sentence disclaimer covering: regional price variation, food safety basics if food topic, consult professionals for medical/financial/legal matters as applicable.

SECTIONS (5-7 sections):
Each section: 200-300 words of genuinely useful content. Include steps and/or tips where natural.

Return ONLY valid JSON matching this exact structure (no markdown fences, no extra text):
{
  "title": "${topic.title}",
  "subtitle": "${topic.subtitle}",
  "targetAudience": "${topic.targetAudience}",
  "introduction": "120-180 word introduction that explains what the buyer will be able to DO after using this toolkit. No personal history claims.",
  "sections": [
    {
      "heading": "Section Heading",
      "content": "200-300 words",
      "steps": ["Step 1", "Step 2"],
      "tips": ["Tip 1", "Tip 2"]
    }
  ],
  "recipes": [],
  "worksheets": [
    {
      "title": "Worksheet Title",
      "subtitle": "One-sentence purpose",
      "rows": [
        {"label": "Field label:", "type": "line"},
        {"label": "Checkbox item", "type": "checkbox"}
      ]
    }
  ],
  "shoppingList": {
    "categories": [
      {
        "category": "Category Name",
        "items": [
          {"item": "Item name", "qty": "quantity", "approxCost": "$0.00"}
        ]
      }
    ],
    "totalEstimate": "$XX.XX"
  },
  "quickReferenceTables": [
    {
      "title": "Table Title",
      "headers": ["Column 1", "Column 2", "Column 3"],
      "rows": [
        ["Row 1 Col 1", "Row 1 Col 2", "Row 1 Col 3"],
        ["Row 2 Col 1", "Row 2 Col 2", "Row 2 Col 3"]
      ]
    }
  ],
  "checklist": ["Action item 1", "Action item 2"],
  "disclaimer": "2-3 sentence disclaimer.",
  "conclusion": "100-130 word practical closing — what to do first, encourage starting small.",
  "etsyDescription": "180-220 word Etsy listing description. Lead with what's INSIDE (X recipes, Y worksheets, Z tables). No personal history claims.",
  "etsyTags": ${JSON.stringify(topic.etsyTags)}
}`;

  const stream = await client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const message = await stream.finalMessage();
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No content generated");

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in content response");

  const parsed = JSON.parse(jsonMatch[0]) as GuideContent;

  // Ensure required arrays exist even if model omits them
  parsed.recipes = parsed.recipes ?? [];
  parsed.worksheets = parsed.worksheets ?? [];
  parsed.quickReferenceTables = parsed.quickReferenceTables ?? [];
  parsed.checklist = parsed.checklist ?? [];
  parsed.disclaimer = parsed.disclaimer ?? "";

  return parsed;
}
