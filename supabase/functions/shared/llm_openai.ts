import { mustGetEnv, getEnv } from "./env.ts";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function openaiChatCompletion(messages: ChatMessage[]) {
  const apiKey = mustGetEnv("OPENAI_API_KEY");
  const model = getEnv("OPENAI_MODEL", "gpt-4.1-mini")!;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OPENAI_HTTP_${res.status}: ${text}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "";
  return content as string;
}
