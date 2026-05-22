import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients, clientPhones, clientAddresses, socialProfiles, osintSearchLogs } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { addOSINTJob } from "@/server/queue/osint.queue";

export async function POST(req: Request) {
  await requireUser();
  const { clientId, force } = await req.json();
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  const [phoneRow] = await db.select().from(clientPhones).where(eq(clientPhones.clientId, clientId)).limit(1);
  const [addressRow] = await db.select().from(clientAddresses).where(eq(clientAddresses.clientId, clientId)).limit(1);
  const duplicate = await db.select().from(osintSearchLogs).where(and(eq(osintSearchLogs.clientId, clientId), eq(osintSearchLogs.searchType, "identity_correlation"))).limit(1);
  if (duplicate.length && !force) return NextResponse.json({ queued: false, reason: "duplicate_recent_search" });
  const job = await addOSINTJob({ clientId, name: client.name || "", phone: phoneRow?.phone || undefined, city: addressRow?.city || undefined, company: client.company || undefined });
  await db.insert(osintSearchLogs).values({ clientId, searchType: "identity_correlation", query: client.name || clientId, status: "queued", metadata: { jobId: job.id } });
  return NextResponse.json({ queued: true, jobId: job.id });
}

export async function GET(req: Request) {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });
  const profiles = await db.select().from(socialProfiles).where(eq(socialProfiles.clientId, clientId));
  return NextResponse.json({ profiles });
}
