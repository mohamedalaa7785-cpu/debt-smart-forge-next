import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients, clientAddresses, clientPhones, identityMatches, osintSearchLogs, socialProfiles } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { calculateConfidence, generateIdentitySummary, type SocialCandidate } from "@/server/services/identity-matching.service";

export async function POST(req: Request) {
  try {
    console.log("[identity-match] request received");
    await requireUser();
    const { clientId } = await req.json();
    if (!clientId) return NextResponse.json({ success: false, data: null, error: "clientId required" }, { status: 400 });

    const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    if (!client) return NextResponse.json({ success: false, data: null, error: "Client not found" }, { status: 404 });
    const [phone] = await db.select().from(clientPhones).where(eq(clientPhones.clientId, clientId)).limit(1);
    const [address] = await db.select().from(clientAddresses).where(eq(clientAddresses.clientId, clientId)).limit(1);
    const profiles = await db.select().from(socialProfiles).where(eq(socialProfiles.clientId, clientId));

    const input = { name: client.name || "", email: client.email || "", company: client.company || "", city: address?.city || "", phone: phone?.phone || "" };
    const matches = profiles.map((p) => {
      const candidate: SocialCandidate = { platform: p.platform, profileUrl: p.profileUrl, title: p.title || "", snippet: p.snippet || "", metadata: (p.metadata || {}) as Record<string, unknown> };
      return { ...calculateConfidence(input, candidate), platform: p.platform, profileUrl: p.profileUrl, title: p.title };
    });

    if (matches.length) {
      await db.insert(identityMatches).values(matches.map((m) => ({
        clientId,
        platform: m.platform,
        profileUrl: m.profileUrl,
        confidenceScore: m.confidence_score,
        identityProbability: m.confidence_score,
        fraudIndicators: m.fraud_indicators,
        matchedFields: m.matched_fields,
        reasoning: m.reasoning,
        metadata: { riskLevel: m.risk_level, title: m.title },
      })));
    }

    await db.insert(osintSearchLogs).values({ clientId, searchType: "identity_match", query: client.name || clientId, status: "ok", metadata: { matches: matches.length } });
    const summary = await generateIdentitySummary(input, matches);
    return NextResponse.json({ success: true, data: { matches, summary }, error: null });
  } catch (error) {
    console.error("[identity-match] error", error);
    return NextResponse.json({ success: false, data: { matches: [], summary: "" }, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
