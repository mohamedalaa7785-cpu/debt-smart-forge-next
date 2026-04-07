import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getClientById, getClientsForUser } from "@/server/services/client.service";
import { sortClientsByPriority } from "@/server/core/priority.engine";
import { requireUser } from "@/server/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const clients = await getClientsForUser(user.id, user.role);

    const full = await Promise.all(clients.map((c: any) => getClientById(c.id)));
    const valid = full.filter(Boolean);
    const sorted = sortClientsByPriority(valid);

    return NextResponse.json({
      success: true,
      data: sorted.slice(0, 20),
    });
  } catch (error: any) {
    const status = error?.message === "Unauthorized" || error?.message === "Invalid session" ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error?.message || "Priority failed" },
      { status }
    );
  }
}
