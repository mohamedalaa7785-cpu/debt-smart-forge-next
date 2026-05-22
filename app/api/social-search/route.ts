import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { db } from "@/server/db";
import { socialProfiles } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { enqueueOsintJob } from "@/server/queue/osint.queue";

export async function POST(req: Request) {
  try {
    console.log("[social-search] request received");
    await requireUser();
    const { clientId, name, phone } = await req.json();

    if (!clientId || !name) {
      return NextResponse.json({ success: false, data: null, error: "clientId and name required" }, { status: 400 });
    }

    const job = await enqueueOsintJob({ type: "social-search", clientId, name, phone });
    console.log("[social-search] queue add status", { queued: Boolean(job), jobId: job?.id ?? null });

    if (!job) {
      return NextResponse.json({ success: false, data: [], error: "Queue unavailable" }, { status: 503 });
    }

    return NextResponse.json({ success: true, data: { queued: true, jobId: job.id }, error: null });
  } catch (error) {
    console.error("[social-search] error", error);
    return NextResponse.json({ success: false, data: [], error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    console.log("[social-search] history request received");
    await requireUser();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ success: false, data: [], error: "clientId required" }, { status: 400 });
    const profiles = await db.select().from(socialProfiles).where(eq(socialProfiles.clientId, clientId));
    return NextResponse.json({ success: true, data: profiles, error: null });
  } catch (error) {
    console.error("[social-search] GET error", error);
    return NextResponse.json({ success: false, data: [], error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
