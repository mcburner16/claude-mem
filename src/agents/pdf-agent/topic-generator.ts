import Anthropic from "@anthropic-ai/sdk";

// High-demand Etsy PDF niches with proven sales track records
export const PROFITABLE_NICHES = [
  "meal planning & nutrition",
  "home organization & decluttering",
  "budget planning & personal finance",
  "fitness & workout routines",
  "gardening & plant care",
  "DIY home improvement",
  "journaling & mental wellness",
  "small business & side hustle",
  "parenting & child development",
  "wedding planning",
  "self-care & mindfulness",
  "homeschool & education",
  "productivity & time management",
  "crafts & creative hobbies",
  "pet care & training",
  "natural beauty & skincare",
  "minimalism & simple living",
  "travel planning & packing",
  "sourdough & bread baking",
  "houseplant care",
];

export interface TopicBatch {
  niche: string;
  topics: TopicEntry[];
}

export interface TopicEntry {
  title: string;
  subtitle: string;
  targetAudience: string;
  keyPoints: string[];
  etsyTags: string[];
}

export async function generateTopics(
  client: Anthropic,
  niche: string,
  count: number
): Promise<TopicEntry[]> {
  const stream = await client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    messages: [
      {
        role: "user",
        content: `Generate ${count} unique, high-demand how-to guide topics for the "${niche}" niche that would sell well as PDF digital downloads on Etsy.

Requirements:
- Each guide must solve a specific, actionable problem
- Target buyers who want practical step-by-step help
- Titles should be compelling and searchable
- Include relevant Etsy search tags (13 max per listing)

Return ONLY valid JSON in this exact format:
{
  "topics": [
    {
      "title": "The Complete Guide to [Topic]: [Benefit]",
      "subtitle": "A practical subtitle explaining the value",
      "targetAudience": "Who this guide is for",
      "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
      "etsyTags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12", "tag13"]
    }
  ]
}`,
      },
    ],
  });

  const message = await stream.finalMessage();
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text in response");

  // Extract JSON from response (may have markdown code fences)
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in topic generation response");

  const parsed = JSON.parse(jsonMatch[0]) as { topics: TopicEntry[] };
  return parsed.topics.slice(0, count);
}

export function selectNiche(preferredNiche?: string): string {
  if (preferredNiche) return preferredNiche;
  return PROFITABLE_NICHES[Math.floor(Math.random() * PROFITABLE_NICHES.length)];
}
