import OpenAI from "openai";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const AI_PROVIDER = "groq";

let groqClient: OpenAI | null = null;

function requireGroqApiKey() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("[ai] Missing GROQ_API_KEY. Set process.env.GROQ_API_KEY before starting the app.");
  }
  return apiKey;
}

export function validateGroqConfiguration() {
  const apiKey = requireGroqApiKey();
  console.info(`[ai] provider selected: ${AI_PROVIDER}`);
  console.info(`[ai] model selected: ${GROQ_MODEL}`);
  console.info(`[ai] API initialization status: ready (baseURL=${GROQ_BASE_URL})`);
  return { apiKey, provider: AI_PROVIDER, model: GROQ_MODEL, baseURL: GROQ_BASE_URL };
}

export function getGroqModel() {
  return GROQ_MODEL;
}

export function getGroqClient() {
  if (groqClient) return groqClient;
  const { apiKey } = validateGroqConfiguration();
  groqClient = new OpenAI({
    apiKey,
    baseURL: GROQ_BASE_URL,
  });
  return groqClient;
}
