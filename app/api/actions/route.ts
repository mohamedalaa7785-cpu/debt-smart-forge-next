import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { clientActions } from "@/server/db/schema";
import { parseNumber } from "@/lib/utils";

/* =========================
   VALIDATION
========================= */
function validate(body: any) {
  if (!body.clientId) return "clientId is required";
  if (!body.actionType) return "actionType is required";
  return null;
}

/* =========================
   SANITIZATION
========================= */
function sanitize(body: any) {
  return {
    clientId: body.clientId,
    actionType: String(body.actionType).toUpperCase(),

    note: body.note?.trim() || null,

    result: body.result?.trim() || null,
    nextActionDate: body.nextActionDate || null,

    amountPaid: parseNumber(body.amountPaid || 0),
  };
}

/* =========================
   ACTION TYPE NORMALIZATION
========================= */
function normalizeActionType(type: string) {
  const t = type.toUpperCase();

  if (["CALL", "CALL_ATTEMPT"].includes(t)) return "CALL";
  if (["WHATSAPP", "MSG"].includes(t)) return "WHATSAPP";
  if (["VISIT"].includes(t)) return "VISIT";
  if (["PAYMENT"].includes(t)) return "PAYMENT";

  return "NOTE";
}

/* =========================
   CREATE ACTION
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

    const actionType = normalizeActionType(clean.actionType);

    /* =========================
       INSERT
    ========================= */
    const [action] = await db
      .insert(clientActions)
      .values({
        clientId: clean.clientId,
        actionType,

        note: clean.note,
        result: clean.result,

        amountPaid: clean.amountPaid.toString(),
        nextActionDate: clean.nextActionDate,
      })
      .returning();

    /* =========================
       SMART RESPONSE 🔥
    ========================= */
    return NextResponse.json({
      success: true,
      data: action,

      meta: {
        isPayment: actionType === "PAYMENT",
        requiresFollowUp: !clean.nextActionDate,
      },
    });
  } catch (error) {
    console.error("ACTION ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Action failed",
      },
      { status: 500 }
    );
  }
    }
