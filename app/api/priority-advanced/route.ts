import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getClientById, getAllClients } from "@/server/services/client.service";
import { sortClientsByPriority } from "@/server/core/priority.engine";
import { withApiGuard } from "@/server/lib/auth";

export async function GET(req: NextRequest) {
  return withApiGuard(req, { method: "GET", route: "/api/priority-advanced" }, async () => {
    try {
      const clients = await getAllClients();
      const full = await Promise.all(clients.map((c: any) => getClientById(c.id)));
      const valid = full.filter(Boolean);
      const sorted = sortClientsByPriority(valid);
      return NextResponse.json({ success: true, data: sorted.slice(0, 20) });
    } catch {
      return NextResponse.json({ success: false, error: "Priority failed" }, { status: 500 });
    }
  });
}
