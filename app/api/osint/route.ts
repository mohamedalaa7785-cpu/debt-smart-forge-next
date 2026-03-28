import { NextResponse } from "next/server";
import { runOSINT } from "@/server/services/osint.service";
import { db } from "@/server/db";
import { osintResults } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/* =========================
   VALIDATION
========================= */
function validate(body: any) {
  if (!body.name && !body.phone) {
    return "Name or phone required";
  }

  return null;
}

/* =========================
   SANITIZATION
========================= */
function sanitize(body: any) {
  return {
    clientId: body.clientId || null,

    name: body.name?.trim() || null,
    phone: body.phone?.trim() || null,
    company: body.company?.trim() || null,
    city: body.city?.trim() || null,

    imageUrl: body.imageUrl || null,
  };
}

/* =========================
   UPSERT RESULT
========================= */
async function saveResult(clientId: string, result: any) {
  const existing = await db.query.osintResults.findFirst({
    where: eq(osintResults.clientId, clientId),
  });

  if (existing) {
    await db
      .update(osintResults)
      .set({
        summary: result.summary,
        confidenceScore: result.confidenceScore,
        rawData: JSON.stringify(result),
      })
      .where(eq(osintResults.clientId, clientId));

    return;
  }

  await db.insert(osintResults).values({
    clientId,
    summary: result.summary,
    confidenceScore: result.confidenceScore,
    rawData: JSON.stringify(result),
  });
}

/* =========================
   POST OSINT
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    /* =========================
       VALIDATION
    ========================= */
    const error = validate(body);

    if (error) {
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }

    /* =========================
       SANITIZE
    ========================= */
    const clean = sanitize(body);

    /* =========================
       RUN OSINT ENGINE 🔥
    ========================= */
    const result = await runOSINT({
      name: clean.name,
      phone: clean.phone,
      company: clean.company,
      city: clean.city,
      imageUrl: clean.imageUrl,
    });

    /* =========================
       SAVE (IF LINKED TO CLIENT)
    ========================= */
    if (clean.clientId && result) {
      await saveResult(clean.clientId, result);
    }

    /* =========================
       SMART RESPONSE
    ========================= */
    return NextResponse.json({
      success: true,
      data: result,

      meta: {
        hasImageAnalysis: !!clean.imageUrl,
        confidence: result?.confidenceScore || 0,
      },
    });
  } catch (error) {
    console.error("OSINT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "OSINT failed",
      },
      { status: 500 }
    );
  }
}
