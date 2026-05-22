import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { db } from "@/server/db";
import { phoneIntelligence } from "@/server/db/schema";
import { desc, eq } from "drizzle-orm";
import { enqueueOsintJob } from "@/server/queue/osint.queue";

export async function POST(req: Request) {
  await requireUser();
  const { clientId, phone } = await req.json();
  if (!phone || !clientId) return NextResponse.json({ error: "clientId and phone required" }, { status: 400 });

  const job = await enqueueOsintJob({ type: "phone-intelligence", clientId, phone });
  if (!job) return NextResponse.json({ error: "queue unavailable" }, { status: 503 });

  return NextResponse.json({ queued: true, jobId: job.id });
}

export async function GET(req: Request) {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });
  const history = await db.select().from(phoneIntelligence).where(eq(phoneIntelligence.clientId, clientId)).orderBy(desc(phoneIntelligence.updatedAt)).limit(20);
  return NextResponse.json({ history });
}
