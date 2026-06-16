/**
 * Minimal server-side client for the Anthropic Messages API.
 *
 * Dependency-free (uses fetch, mirroring src/lib/fmp/client.ts) so we don't pin
 * an SDK version against the bleeding-edge Next 16 / React 19 stack. The key
 * never leaves the server. When ANTHROPIC_API_KEY is unset the caller is
 * expected to fall back to static content — same graceful-degradation pattern
 * the FMP and Massive integrations use.
 */

export class AiError extends Error {
  constructor(
    message: string,
    readonly code: "CONFIG" | "HTTP" | "PARSE" = "HTTP",
  ) {
    super(message);
    this.name = "AiError";
  }
}

/**
 * Model tiers. Cheap+fast for high-volume explainers, smart for reasoning,
 * deep for occasional heavy synthesis. Overridable via env for easy upgrades.
 */
export const AI_MODELS = {
  fast: process.env.ANTHROPIC_MODEL_FAST?.trim() || "claude-haiku-4-5-20251001",
  smart: process.env.ANTHROPIC_MODEL_SMART?.trim() || "claude-sonnet-4-6",
  deep: process.env.ANTHROPIC_MODEL_DEEP?.trim() || "claude-opus-4-8",
} as const;

export type ModelTier = keyof typeof AI_MODELS;

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new AiError("ANTHROPIC_API_KEY is not configured", "CONFIG");
  return key;
}

interface TextBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

export interface AiMessageOptions {
  tier?: ModelTier;
  /** System prompt blocks. Mark the large, reused (grounded) block cacheable. */
  system: TextBlock[];
  /** The user turn(s). */
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  temperature?: number;
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
  error?: { message?: string };
}

/** Call the Messages API and return the concatenated text output. */
export async function aiMessage(opts: AiMessageOptions): Promise<string> {
  const apiKey = getApiKey();
  const model = AI_MODELS[opts.tier ?? "fast"];

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 700,
      temperature: opts.temperature ?? 0.4,
      system: opts.system,
      messages: opts.messages,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const body = (await res.json()) as AnthropicResponse;
      if (body.error?.message) detail = `${res.status}: ${body.error.message}`;
    } catch {
      /* ignore parse error */
    }
    throw new AiError(`Anthropic request failed (${detail})`, "HTTP");
  }

  const data = (await res.json()) as AnthropicResponse;
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("")
    .trim();

  if (!text) throw new AiError("Anthropic returned no text", "PARSE");
  return text;
}
