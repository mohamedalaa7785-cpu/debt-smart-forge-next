import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { db } from "@/server/db";
import { phoneIntelligence } from "@/server/db/schema";
import { desc, eq } from "drizzle-orm";
import { phoneLookup } from "@/server/services/phone-intelligence.service";

export async function POST(req: Request) {
  try {
    console.log("[phone-intelligence] request received");
    await requireUser();
    const { clientId, phone } = await req.json();
    if (!phone || !clientId) return NextResponse.json({ success: false, data: null, error: "clientId and phone required" }, { status: 400 });

    const lookup = await phoneLookup(String(phone));
    const [inserted] = await db.insert(phoneIntelligence).values({
      clientId,
      phone: lookup.normalized,
      fullName: lookup.name,
      country: lookup.country,
      carrier: lookup.carrier,
      whatsappAvailable: lookup.whatsappAvailable,
      telegramAvailable: lookup.telegramAvailable,
      spamScore: lookup.risk_score,
      confidenceScore: lookup.confidenceScore,
      possibleAliases: [],
      tags: lookup.tags,
      profileImage: null,
    }).returning();

    return NextResponse.json({ success: true, data: { result: inserted, provider: lookup.provider }, error: null });
  } catch (error) {
    console.error("[phone-intelligence] POST error", error);
    return NextResponse.json({ success: false, data: null, error: error instanceof Error ? error.message : "Unknown error" }, { status: 502 });
  }
}

export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ success: false, data: [], error: "clientId required" }, { status: 400 });
    const history = await db.select().from(phoneIntelligence).where(eq(phoneIntelligence.clientId, clientId)).orderBy(desc(phoneIntelligence.updatedAt)).limit(20);
    return NextResponse.json({ success: true, data: history, error: null });
  } catch (error) {
    console.error("[phone-intelligence] GET error", error);
    return NextResponse.json({ success: false, data: [], error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
