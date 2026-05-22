import OpenAI from "openai";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";

let groqClient: OpenAI | null = null;

export function getGroqModel() {
  return GROQ_MODEL;
}

export function getGroqClient() {
  if (groqClient) return groqClient;
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;

  groqClient = new OpenAI({
    apiKey,
    baseURL: GROQ_BASE_URL,
  });
  return groqClient;
}
