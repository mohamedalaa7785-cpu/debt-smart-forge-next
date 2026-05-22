import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients, clientAddresses, clientPhones, socialProfiles } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { calculateConfidence, generateIdentitySummary, type SocialCandidate } from "@/server/services/identity-matching.service";

export async function POST(req: Request) {
  await requireUser();
  const { clientId } = await req.json();
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  const [phone] = await db.select().from(clientPhones).where(eq(clientPhones.clientId, clientId)).limit(1);
  const [address] = await db.select().from(clientAddresses).where(eq(clientAddresses.clientId, clientId)).limit(1);
  const profiles = await db.select().from(socialProfiles).where(eq(socialProfiles.clientId, clientId));
  const input = { name: client.name || "", email: client.email || "", company: client.company || "", city: address?.city || "", phone: phone?.phone || "" };
  const matches = profiles.map((p) => {
    const candidate: SocialCandidate = { platform: p.platform, profileUrl: p.profileUrl, title: p.title || "", snippet: p.snippet || "", metadata: (p.metadata || {}) as Record<string, unknown> };
    return { ...calculateConfidence(input, candidate), platform: p.platform, profileUrl: p.profileUrl, title: p.title };
  });
  const summary = await generateIdentitySummary(input, matches);
  return NextResponse.json({ matches, summary });
}
