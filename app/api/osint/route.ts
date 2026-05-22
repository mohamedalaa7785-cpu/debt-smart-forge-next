import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/lib/auth";
import { getClientById } from "@/server/services/client.service";
import { enforceRateLimit } from "@/server/core/distributed-cache";
import { handleApiError, ForbiddenError, ValidationError } from "@/server/core/error.handler";
import { enqueueOsintJob } from "@/server/queue/osint.queue";

const OsintRequestSchema = z
  .object({
    clientId: z.string().uuid().optional().nullable(),
    name: z.string().trim().min(1).max(200).optional().nullable(),
    phone: z.string().trim().min(6).max(32).optional().nullable(),
    company: z.string().trim().max(200).optional().nullable(),
    city: z.string().trim().max(120).optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
  })
  .strict()
  .refine((v) => Boolean(v.name || v.phone || v.clientId), "Name or phone or clientId required");

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await enforceRateLimit(`osint:${user.id}:${ip}:${req.nextUrl.pathname}`, 15, 60);

    const rawBody = await req.json();
    const parsed = OsintRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ValidationError("Invalid OSINT payload", { issues: parsed.error.issues.map((issue) => issue.message) });
    }

    const clean = {
      clientId: parsed.data.clientId || null,
      name: parsed.data.name?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      company: parsed.data.company?.trim() || null,
      city: parsed.data.city?.trim() || null,
      imageUrl: parsed.data.imageUrl || null,
    };

    if (clean.clientId) {
      const client = await getClientById(clean.clientId, user.id, user.role);
      if (!client || !client.id) throw new ForbiddenError();
    }

    const job = await enqueueOsintJob({
      type: "osint",
      clientId: clean.clientId || user.id,
      name: clean.name || undefined,
      phone: clean.phone || undefined,
      company: clean.company || undefined,
      city: clean.city || undefined,
      imageUrl: clean.imageUrl || undefined,
    });

    if (!job) return NextResponse.json({ success: false, error: "Queue unavailable" }, { status: 503 });

    return NextResponse.json({ success: true, queued: true, jobId: job.id });
  } catch (error) {
    return handleApiError(error);
  }
}
