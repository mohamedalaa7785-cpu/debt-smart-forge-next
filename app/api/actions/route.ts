import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { clientActions } from "@/server/db/schema";
import { parseNumber } from "@/lib/utils";
import { requireUser } from "@/server/lib/auth";
import { canAccessClient, getClientById } from "@/server/services/client.service";

function validate(body: any) {
  if (!body.clientId) return "clientId is required";
  if (!body.actionType) return "actionType is required";
  return null;
}

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

function normalizeActionType(type: string) {
  const t = type.toUpperCase();
  if (["CALL", "CALL_ATTEMPT"].includes(t)) return "CALL";
  if (["WHATSAPP", "MSG"].includes(t)) return "WHATSAPP";
  if (["VISIT"].includes(t)) return "VISIT";
  if (["PAYMENT"].includes(t)) return "PAYMENT";
  return "NOTE";
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const error = validate(body);

    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const clean = sanitize(body);
    const client = await getClientById(clean.clientId);
    if (!client || !canAccessClient(client, user.id, user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const actionType = normalizeActionType(clean.actionType);

    const [action] = await db
      .insert(clientActions)
      .values({
        clientId: clean.clientId,
        userId: user.id,
        actionType,
        note: clean.note,
        result: clean.result,
        amountPaid: clean.amountPaid.toString(),
        nextActionDate: clean.nextActionDate,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: action,
      meta: {
        isPayment: actionType === "PAYMENT",
        requiresFollowUp: !clean.nextActionDate,
      },
    });
  } catch (error: any) {
    console.error("ACTION ERROR:", error);
    const status = error?.message === "Unauthorized" || error?.message === "Invalid session" ? 401 : 500;
    return NextResponse.json({ success: false, error: error?.message || "Action failed" }, { status });
  }
}
