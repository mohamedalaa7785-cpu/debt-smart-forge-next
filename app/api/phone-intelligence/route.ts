import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { db } from "@/server/db";
import { phoneIntelligence } from "@/server/db/schema";
import { desc, eq } from "drizzle-orm";
import { enqueueOsintJob } from "@/server/queue/osint.queue";

export async function POST(req: Request) {
  try {
    console.log("[phone-intelligence] request received");
    await requireUser();
    const { clientId, phone } = await req.json();
    if (!phone || !clientId) return NextResponse.json({ success: false, data: null, error: "clientId and phone required" }, { status: 400 });

    const job = await enqueueOsintJob({ type: "phone-intelligence", clientId, phone });
    console.log("[phone-intelligence] queue add status", { queued: Boolean(job), jobId: job?.id ?? null });
    if (!job) return NextResponse.json({ success: false, data: [], error: "Queue unavailable" }, { status: 503 });

    return NextResponse.json({ success: true, data: { queued: true, jobId: job.id }, error: null });
  } catch (error) {
    console.error("[phone-intelligence] POST error", error);
    return NextResponse.json({ success: false, data: [], error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    console.log("[phone-intelligence] history request received");
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
