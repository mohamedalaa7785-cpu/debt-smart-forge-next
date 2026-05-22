import OpenAI from "openai";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const OPENAI_BASE_URL = "https://api.openai.com/v1";
const OPENAI_MODEL = "gpt-4.1-mini";

let groqClient: OpenAI | null = null;

type AIConfig = {
  apiKey: string;
  provider: "groq" | "openai";
  model: string;
  baseURL: string;
};

function resolveAIConfiguration(): AIConfig | null {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (groqApiKey) {
    return { apiKey: groqApiKey, provider: "groq", model: GROQ_MODEL, baseURL: GROQ_BASE_URL };
  }

  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiApiKey) {
    return { apiKey: openAiApiKey, provider: "openai", model: OPENAI_MODEL, baseURL: OPENAI_BASE_URL };
  }

  return null;
}

export function validateGroqConfiguration() {
  const config = resolveAIConfiguration();
  if (!config) {
    console.warn("[ai] AI disabled: no provider key found (expected GROQ_API_KEY or OPENAI_API_KEY).");
    return null;
  }

  console.info(`[ai] provider selected: ${config.provider}`);
  console.info(`[ai] model selected: ${config.model}`);
  console.info(`[ai] API initialization status: ready (baseURL=${config.baseURL})`);
  return config;
}

export function getGroqModel() {
  return validateGroqConfiguration()?.model ?? GROQ_MODEL;
}

export function getGroqClient() {
  if (groqClient) return groqClient;
  const config = validateGroqConfiguration();
  if (!config) {
    return null;
  }

  groqClient = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
  return groqClient;
}
