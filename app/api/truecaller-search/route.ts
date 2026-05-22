import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients, osintSearchLogs, phoneIntelligence } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { phoneLookup } from "@/server/services/phone-intelligence.service";

export async function POST(req: Request) {
  await requireUser();
  const { clientId, phone, name, aliases = [] } = await req.json();
  if (!clientId || (!phone && !name)) {
    return NextResponse.json({ error: "clientId and phone or name required" }, { status: 400 });
  }

  const normalizedPhone = String(phone || "").trim();
  const lookup = normalizedPhone ? await phoneLookup(normalizedPhone) : { normalized: "", risk_score: 35, source: "name-correlation", name: name || null };
  const [client] = await db.select({ name: clients.name }).from(clients).where(eq(clients.id, clientId)).limit(1);

  const [inserted] = await db.insert(phoneIntelligence).values({
    clientId,
    phone: lookup.normalized || normalizedPhone || "unknown",
    fullName: lookup.name || name || client?.name || null,
    country: "Unknown",
    carrier: "Unknown",
    whatsappAvailable: Boolean(normalizedPhone),
    telegramAvailable: Boolean(normalizedPhone),
    spamScore: lookup.risk_score,
    confidenceScore: lookup.source === "mixed" ? 82 : 68,
    possibleAliases: Array.isArray(aliases) ? aliases : [],
    tags: ["truecaller-style", lookup.source],
    profileImage: null,
  }).returning();

  await db.insert(osintSearchLogs).values({ clientId, searchType: "truecaller_search", query: normalizedPhone || String(name || "").trim(), status: "ok", metadata: { provider: "phoneLookup", source: lookup.source } });
  return NextResponse.json({ result: inserted });
}
