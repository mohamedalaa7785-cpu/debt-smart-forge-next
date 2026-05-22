import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients, osintSearchLogs, phoneIntelligence } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { phoneLookup } from "@/server/services/phone-intelligence.service";

export async function POST(req: Request) {
  try {
    await requireUser();
    const body = await req.json().catch(() => ({}));
    const { clientId, phone, name, aliases = [] } = body ?? {};

    if (!clientId || !phone) {
      return Response.json({ success: false, data: null, error: "clientId and phone required" }, { status: 400 });
    }

    const lookup = await phoneLookup(String(phone).trim());
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
      possibleAliases: Array.isArray(aliases) ? aliases : lookup.aliases,
      tags: lookup.tags,
      profileImage: null,
    }).returning();

    const history = await db.select().from(phoneIntelligence).where(eq(phoneIntelligence.clientId, clientId));

    await db.insert(osintSearchLogs).values({ clientId, searchType: "truecaller_search", query: lookup.normalized, status: "ok", metadata: { provider: lookup.provider, source: lookup.source } });

    return Response.json({
      success: true,
      data: {
        phone: inserted.phone,
        fullName: inserted.fullName,
        country: inserted.country || "Egypt",
        carrier: inserted.carrier,
        whatsappAvailable: inserted.whatsappAvailable,
        telegramAvailable: inserted.telegramAvailable,
        spamScore: inserted.spamScore,
        confidenceScore: inserted.confidenceScore,
        tags: inserted.tags || [],
        source: lookup.provider === "local-intelligence" ? "local-intelligence" : lookup.source,
        provider: lookup.provider,
        history,
      },
      error: null,
    });
  } catch (error) {
    console.error("[truecaller-search] error", error);
    return Response.json({
      success: true,
      data: {
        phone: "",
        fullName: null,
        country: "Egypt",
        carrier: null,
        whatsappAvailable: false,
        telegramAvailable: false,
        spamScore: 0,
        confidenceScore: 0,
        tags: ["fallback"],
        source: "fallback",
      },
      error: null,
    });
  }
}
