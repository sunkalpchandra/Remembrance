import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export interface ModelSchema {
  name: string;
  id: string;
  modelID: string;
  providerKey: "digitalocean" | "hackclub" | "custom";
  maxTokens?: number;
}

// Providers are created lazily so importing this module never throws and
// serverless bundles only pay for what a request actually uses.
const providerCache = new Map<string, OpenAI | null>();

function buildProvider(key: ModelSchema["providerKey"]): OpenAI | null {
  switch (key) {
    case "digitalocean":
      if (!process.env.DIGITALOCEAN_KEY) return null;
      return new OpenAI({
        apiKey: process.env.DIGITALOCEAN_KEY,
        baseURL: "https://inference.do-ai.run/v1",
      });
    case "hackclub":
      if (!process.env.HACKCLUB_KEY) return null;
      return new OpenAI({
        apiKey: process.env.HACKCLUB_KEY,
        baseURL: "https://ai.hackclub.com/proxy/v1",
      });
    case "custom":
      if (!process.env.OPENAI_API_KEY) return null;
      return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        // Defaults to api.openai.com when OPENAI_BASE_URL is unset
        baseURL: process.env.OPENAI_BASE_URL || undefined,
      });
  }
}

export function getProvider(key: ModelSchema["providerKey"]): OpenAI | null {
  if (!providerCache.has(key)) providerCache.set(key, buildProvider(key));
  return providerCache.get(key) ?? null;
}

export const models: ModelSchema[] = [
  { name: "Max", id: "max", modelID: "glm-5", providerKey: "digitalocean" },
  { name: "High", id: "high", modelID: "kimi-k2.5", providerKey: "digitalocean" },
  {
    name: "Medium",
    id: "medium",
    modelID: "openai-gpt-oss-120b",
    providerKey: "digitalocean",
  },
  {
    name: "Low",
    id: "low",
    modelID: "google/gemini-3-flash-preview",
    providerKey: "hackclub",
  },
];

export interface ResolvedModel {
  provider: OpenAI;
  modelID: string;
}

/**
 * Resolve a UI model id ("max" | "high" | …) to a usable provider+model.
 * Falls back to the generic OpenAI-compatible env config
 * (OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL) when the preferred
 * provider has no key, so a single env var set is enough to run chat.
 */
export function resolveModel(modelId: string): ResolvedModel | null {
  const schema = models.find((m) => m.id === modelId) ?? models[0];

  const preferred = getProvider(schema.providerKey);
  if (preferred) return { provider: preferred, modelID: schema.modelID };

  const custom = getProvider("custom");
  if (custom) {
    return { provider: custom, modelID: process.env.OPENAI_MODEL || "gpt-4o-mini" };
  }

  // Any configured provider beats none
  for (const m of models) {
    const p = getProvider(m.providerKey);
    if (p) return { provider: p, modelID: m.modelID };
  }
  return null;
}

/** Cheap, fast model for one-shot utility calls (titles, labels). */
export function resolveUtilityModel(): ResolvedModel | null {
  const hackclub = getProvider("hackclub");
  if (hackclub)
    return { provider: hackclub, modelID: "google/gemini-3-flash-preview" };
  return resolveModel("medium");
}
