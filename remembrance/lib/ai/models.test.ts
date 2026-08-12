import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The registry caches providers per module instance, so each test gets a
// fresh import with its own env.
async function freshModels(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const key of [
    "DIGITALOCEAN_KEY",
    "HACKCLUB_KEY",
    "OPENAI_API_KEY",
    "OPENAI_BASE_URL",
    "OPENAI_MODEL",
  ]) {
    delete process.env[key];
  }
  Object.assign(process.env, env);
  return import("./models");
}

const ORIGINAL_ENV = { ...process.env };

describe("resolveModel", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns null when no provider is configured", async () => {
    const { resolveModel } = await freshModels({});
    expect(resolveModel("max")).toBeNull();
  });

  it("uses the preferred provider when its key exists", async () => {
    const { resolveModel } = await freshModels({ DIGITALOCEAN_KEY: "do-key" });
    const resolved = resolveModel("max");
    expect(resolved).not.toBeNull();
    expect(resolved!.modelID).toBe("glm-5");
  });

  it("falls back to the generic OpenAI-compatible config", async () => {
    const { resolveModel } = await freshModels({
      OPENAI_API_KEY: "sk-test",
      OPENAI_MODEL: "my-model",
    });
    const resolved = resolveModel("max");
    expect(resolved).not.toBeNull();
    expect(resolved!.modelID).toBe("my-model");
  });

  it("falls back to any configured named provider", async () => {
    const { resolveModel } = await freshModels({ HACKCLUB_KEY: "hc-key" });
    // "max" prefers DigitalOcean, which has no key — hackclub's model wins
    const resolved = resolveModel("max");
    expect(resolved).not.toBeNull();
    expect(resolved!.modelID).toBe("google/gemini-3-flash-preview");
  });

  it("resolves unknown model ids to the default tier", async () => {
    const { resolveModel } = await freshModels({ DIGITALOCEAN_KEY: "do-key" });
    expect(resolveModel("nonsense")!.modelID).toBe("glm-5");
  });
});

describe("resolveUtilityModel", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("prefers the cheap hackclub model when available", async () => {
    const { resolveUtilityModel } = await freshModels({
      HACKCLUB_KEY: "hc-key",
      DIGITALOCEAN_KEY: "do-key",
    });
    expect(resolveUtilityModel()!.modelID).toBe("google/gemini-3-flash-preview");
  });

  it("returns null with no providers", async () => {
    const { resolveUtilityModel } = await freshModels({});
    expect(resolveUtilityModel()).toBeNull();
  });
});
