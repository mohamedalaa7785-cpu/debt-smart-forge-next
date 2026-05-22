import { Job, Worker } from "bullmq";
import { getRedisClient } from "@/lib/redis";
import { OSINT_QUEUE_NAME, type OsintJobPayload } from "@/server/queue/osint.queue";
import { runOSINT } from "@/server/services/osint.service";
import { phoneLookup } from "@/server/services/phone-intelligence.service";
import { db } from "@/server/db";
import { clients, osintSearchLogs, phoneIntelligence, socialProfiles } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/server/lib/logger";

async function processSocialSearch(data: OsintJobPayload) {
  const key = process.env.SERPAPI_API_KEY?.trim();
  if (!key || !data.name) throw new Error("SERPAPI_API_KEY or name missing");

  const query = `site:facebook.com \"${data.name}\" \"${data.phone || ""}\"`;
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", key);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const body = await res.json();
  const hit = body?.organic_results?.[0];
  if (hit?.link) {
    await db.insert(socialProfiles).values({
      clientId: data.clientId,
      platform: "Facebook",
      profileUrl: hit.link,
      title: hit.title || "",
      snippet: hit.snippet || "",
      confidenceScore: 70,
    });
  }

  await db.insert(osintSearchLogs).values({ clientId: data.clientId, searchType: "social_search", query, status: "ok", metadata: { hit: hit?.link || null } });

  return { hit };
}

async function processPhoneIntelligence(data: OsintJobPayload) {
  if (!data.phone) throw new Error("phone missing");
  const result = await phoneLookup(data.phone);
  const [client] = await db.select({ name: clients.name }).from(clients).where(eq(clients.id, data.clientId)).limit(1);
  await db.insert(phoneIntelligence).values({
    clientId: data.clientId,
    phone: result.normalized,
    fullName: result.name || client?.name || null,
    country: "Unknown",
    carrier: "Unknown",
    whatsappAvailable: false,
    telegramAvailable: false,
    spamScore: result.risk_score,
    confidenceScore: result.source === "mixed" ? 78 : 60,
    possibleAliases: [],
    tags: [result.source],
    profileImage: null,
  });
  await db.insert(osintSearchLogs).values({ clientId: data.clientId, searchType: "phone_intelligence", query: result.normalized, status: "ok", metadata: { source: result.source } });
  return result;
}

async function processAiAnalysis(data: OsintJobPayload) {
  return runOSINT({ clientId: data.clientId, name: data.name || "", phone: data.phone, company: data.company, city: data.city, imageUrl: data.imageUrl });
}

async function processOsint(data: OsintJobPayload) {
  return runOSINT({ clientId: data.clientId, name: data.name || "", phone: data.phone, company: data.company, city: data.city, imageUrl: data.imageUrl });
}

async function handleJob(job: Job<OsintJobPayload>) {
  switch (job.data.type) {
    case "social-search":
      return processSocialSearch(job.data);
    case "phone-intelligence":
      return processPhoneIntelligence(job.data);
    case "ai-analysis":
      return processAiAnalysis(job.data);
    case "osint":
    default:
      return processOsint(job.data);
  }
}

async function bootstrap() {
  const connection = await getRedisClient();
  if (!connection) throw new Error("REDIS_URL is required for worker");

  const worker = new Worker<OsintJobPayload>(OSINT_QUEUE_NAME, handleJob, {
    connection,
    concurrency: 5,
  });

  worker.on("completed", (job) => logger.info("OSINT_WORKER_COMPLETED", { id: job.id, name: job.name }));
  worker.on("failed", (job, error) => logger.error("OSINT_WORKER_FAILED", { id: job?.id, name: job?.name, error: error.message }));

  logger.info("OSINT_WORKER_READY", { queue: OSINT_QUEUE_NAME });
}

bootstrap().catch((error) => {
  logger.error("OSINT_WORKER_BOOTSTRAP_FAILED", { error: error.message });
  process.exit(1);
});
