import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clientActions } from "@/server/db/schema";
import { parseNumber } from "@/lib/utils";
import { getClientById } from "@/server/services/client.service";
import { logAction } from "@/server/services/log.service";
import { CreateActionBodySchema } from "@/lib/validators/api";

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
  return withAuth(async (user) => {
    try {
      const rawBody = await req.json();
      const parsed = CreateActionBodySchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: "Invalid action payload" }, { status: 400 });
      }

      const body = parsed.data;
      const client = await getClientById(body.clientId, user.id, user.role);
      if (!client) {
        return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
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
          nextActionDate: body.nextActionDate ? new Date(body.nextActionDate) : null,
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
      return NextResponse.json({ success: false, error: error.message || "Action failed" }, { status: 500 });
    }
  });
}
