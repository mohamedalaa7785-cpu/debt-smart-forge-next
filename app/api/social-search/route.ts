import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { db } from "@/server/db";
import { socialProfiles } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { enqueueOsintJob } from "@/server/queue/osint.queue";

export async function POST(req: Request) {
  await requireUser();
  const { clientId, name, phone } = await req.json();
  if (!clientId || !name) return NextResponse.json({ error: "clientId and name required" }, { status: 400 });

  const job = await enqueueOsintJob({ type: "social-search", clientId, name, phone });
  if (!job) return NextResponse.json({ error: "queue unavailable" }, { status: 503 });

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
