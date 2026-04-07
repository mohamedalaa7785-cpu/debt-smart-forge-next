import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clientActions } from "@/server/db/schema";
import { parseNumber } from "@/lib/utils";
import { canAccessClient, getClientById } from "@/server/services/client.service";
import { logAction } from "@/server/services/log.service";

function normalizeActionType(type: string) {
  const t = String(type).toUpperCase();
  if (["CALL", "CALL_ATTEMPT"].includes(t)) return "CALL";
  if (["WHATSAPP", "MSG"].includes(t)) return "WHATSAPP";
  if (["VISIT"].includes(t)) return "VISIT";
  if (["PAYMENT"].includes(t)) return "PAYMENT";
  if (["FOLLOW", "FOLLOWUP"].includes(t)) return "FOLLOW";
  return "NOTE";
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      const body = await req.json();
      
      if (!body.clientId || !body.actionType) {
        return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
      }

      const client = await getClientById(body.clientId);
      if (!client) {
        return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
      }

      if (!canAccessClient(client as any, user.id, user.role)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }

      const actionType = normalizeActionType(body.actionType);
      const amountPaid = parseNumber(body.amountPaid || 0);

      const [action] = await db
        .insert(clientActions)
        .values({
          clientId: body.clientId,
          userId: user.id,
          actionType,
          note: body.note?.trim() || null,
          result: body.result?.trim() || null,
          amountPaid: amountPaid.toString(),
          nextActionDate: body.nextActionDate || null,
        })
        .returning();

      await logAction(user.id, "CREATE_ACTION", {
        clientId: body.clientId,
        actionType,
        actionId: action.id,
      });

      return NextResponse.json({
        success: true,
        data: action,
        meta: {
          isPayment: actionType === "PAYMENT",
          requiresFollowUp: !body.nextActionDate,
        },
      });
    } catch (error: any) {
      console.error("ACTION ERROR:", error);
      return NextResponse.json({ success: false, error: error.message || "Action failed" }, { status: 500 });
    }
  });
}
