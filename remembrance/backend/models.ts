import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export interface modelSchema {
  name: string;
  id: string;
  modelID: string;
  provider?: OpenAI;
  maxTokens?: number;
}

const digitalOceanProvider = new OpenAI({
  apiKey: process?.env.DIGITALOCEAN_KEY,
  baseURL: "https://inference.do-ai.run/v1",
});

export const hackClubProvider = new OpenAI({
  apiKey: process?.env.HACKCLUB_KEY,
  baseURL: "https://ai.hackclub.com/proxy/v1",
});

export const models: modelSchema[] = [
  {
    name: "Max",
    id: "max",
    modelID: "glm-5",
    provider: digitalOceanProvider,
  },
  {
    name: "High",
    id: "high",
    modelID: "kimi-k2.5",
    provider: digitalOceanProvider,
  },
  {
    name: "Medium",
    id: "medium",
    modelID: "openai-gpt-oss-120b",
    provider: digitalOceanProvider,
  },
  {
    name: "low",
    id: "low",
    modelID: "google/gemini-3-flash-preview",
    provider: hackClubProvider,
  },
];
