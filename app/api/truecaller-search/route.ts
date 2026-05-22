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
    if (!clientId || (!phone && !name)) {
      return NextResponse.json({ success: false, data: null, error: "clientId and phone or name required" }, { status: 400 });
    }

    const normalizedPhone = String(phone || "").trim();
    const lookup = normalizedPhone ? await phoneLookup(normalizedPhone) : { normalized: "", risk_score: 35, source: "name-correlation", name: name || null };
    console.log("[truecaller-search] provider response", { source: lookup.source, normalized: lookup.normalized || null });
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
    console.log("[truecaller-search] supabase write complete", { clientId });
    return NextResponse.json({ success: true, data: inserted, error: null });
  } catch (error) {
    console.error("[truecaller-search] error", error);
    return NextResponse.json({ success: false, data: [], error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
