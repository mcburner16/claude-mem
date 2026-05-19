import Anthropic from "@anthropic-ai/sdk";
import type { TopicEntry } from "./topic-generator.js";

export interface GuideContent {
  title: string;
  subtitle: string;
  targetAudience: string;
  introduction: string;
  sections: GuideSection[];
  quickTips: string[];
  conclusion: string;
  etsyDescription: string;
  etsyTags: string[];
}

export interface GuideSection {
  heading: string;
  content: string;
  steps?: string[];
  tips?: string[];
}

export async function generateGuideContent(
  client: Anthropic,
  topic: TopicEntry
): Promise<GuideContent> {
  const stream = await client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 8192,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    messages: [
      {
        role: "user",
        content: `Write a comprehensive, high-quality how-to guide PDF for Etsy with this topic:

Title: ${topic.title}
Subtitle: ${topic.subtitle}
Target Audience: ${topic.targetAudience}
Key Points to Cover: ${topic.keyPoints.join(", ")}

Requirements:
- Write in a friendly, expert tone — like advice from a knowledgeable friend
- Be genuinely helpful with real, actionable information (not generic fluff)
- Each section should have 200-350 words of substantive content
- Include practical steps where appropriate
- The guide should feel worth $4.99-$9.99 to the buyer

Return ONLY valid JSON in this exact format:
{
  "title": "${topic.title}",
  "subtitle": "${topic.subtitle}",
  "targetAudience": "${topic.targetAudience}",
  "introduction": "150-200 word introduction that hooks the reader and explains what they'll learn",
  "sections": [
    {
      "heading": "Section Heading",
      "content": "200-350 words of substantive content",
      "steps": ["Step 1 if applicable", "Step 2", "Step 3"],
      "tips": ["Pro tip 1 if applicable", "Pro tip 2"]
    }
  ],
  "quickTips": ["10 quick actionable tips as bullet points"],
  "conclusion": "100-150 word motivating conclusion",
  "etsyDescription": "200-word Etsy listing description that sells the guide — include what's inside, who it's for, and why it's valuable",
  "etsyTags": ${JSON.stringify(topic.etsyTags)}
}

Include 5-7 well-developed sections covering the key points.`,
      },
    ],
  });

  const message = await stream.finalMessage();
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No content generated");

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in content response");

  return JSON.parse(jsonMatch[0]) as GuideContent;
}
