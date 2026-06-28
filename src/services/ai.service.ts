import OpenAI from "openai";
import type { AIRequestInput } from "@/schemas";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PROMPTS: Record<AIRequestInput["action"], string> = {
  summarize:
    "Summarize the following document concisely, capturing key points and main ideas:",
  rewrite:
    "Rewrite the following text to improve clarity and flow while preserving meaning:",
  grammar:
    "Fix grammar, spelling, and punctuation errors in the following text. Return only the corrected text:",
  translate:
    "Translate the following text to {language}. Return only the translation:",
  title:
    "Generate a concise, descriptive title (max 10 words) for the following document:",
  tags: "Generate 5 relevant tags for the following document. Return as comma-separated values:",
  explain:
    "Explain the following selected text in simple terms:",
  continue:
    "Continue writing naturally from where this text ends. Match the tone and style:",
  "meeting-notes":
    "Convert the following content into structured meeting notes with attendees, agenda, discussion points, and decisions:",
  "action-items":
    "Extract action items from the following content. Format as a numbered list with assignee and deadline if mentioned:",
  chat: "You are a helpful document assistant. Answer based on the document context provided.",
};

export class AIService {
  static isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  static async process(input: AIRequestInput): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error("OpenAI API key not configured");
    }

    let systemPrompt = PROMPTS[input.action];
    if (input.action === "translate" && input.language) {
      systemPrompt = systemPrompt.replace("{language}", input.language);
    }

    const contentToProcess =
      input.selection && input.action !== "chat"
        ? input.selection
        : input.content;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    if (input.action === "chat") {
      messages.push({
        role: "user",
        content: `Document context:\n${input.content}\n\nUser question: ${input.prompt ?? ""}`,
      });
    } else {
      messages.push({ role: "user", content: contentToProcess });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 2000,
      temperature: input.action === "grammar" ? 0.1 : 0.7,
    });

    return response.choices[0]?.message?.content ?? "";
  }
}
