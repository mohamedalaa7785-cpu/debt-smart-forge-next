import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients, osintSearchLogs, phoneIntelligence } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { phoneLookup } from "@/server/services/phone-intelligence.service";

export async function POST(req: Request) {
  try {
    console.log("[truecaller-search] request received");
    await requireUser();
    const { clientId, phone, name, aliases = [] } = await req.json();
    if (!clientId || !phone) {
      return NextResponse.json({ success: false, data: null, error: "clientId and phone required" }, { status: 400 });
    }

    const lookup = await phoneLookup(String(phone).trim());
    console.log("[truecaller-search] provider response", { source: lookup.source, provider: lookup.provider, normalized: lookup.normalized || null });
    const [client] = await db.select({ name: clients.name }).from(clients).where(eq(clients.id, clientId)).limit(1);

    const [inserted] = await db.insert(phoneIntelligence).values({
      clientId,
      phone: lookup.normalized,
      fullName: lookup.name || name || client?.name || null,
      country: lookup.country,
      carrier: lookup.carrier,
      whatsappAvailable: lookup.whatsappAvailable,
      telegramAvailable: lookup.telegramAvailable,
      spamScore: lookup.risk_score,
      confidenceScore: lookup.confidenceScore,
      possibleAliases: Array.isArray(aliases) ? aliases : [],
      tags: lookup.tags,
      profileImage: null,
    }).returning();

    const history = await db.select().from(phoneIntelligence).where(eq(phoneIntelligence.clientId, clientId));

    await db.insert(osintSearchLogs).values({ clientId, searchType: "truecaller_search", query: lookup.normalized, status: "ok", metadata: { provider: lookup.provider, source: lookup.source } });
    return NextResponse.json({ success: true, data: { result: inserted, history, provider: lookup.provider }, error: null });
  } catch (error) {
    console.error("[truecaller-search] error", error);
    return NextResponse.json({ success: false, data: null, error: error instanceof Error ? error.message : "Unknown error" }, { status: 502 });
  }
}
