import { NextRequest, NextResponse } from "next/server";
import { getClientsForMap } from "@/server/services/map.service";
import { getClientsForUser } from "@/server/services/client.service";
import { requireUser } from "@/server/lib/auth";
import { APIResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const [scopedClients, mapClients] = await Promise.all([
      getClientsForUser(user.id, user.role),
      getClientsForMap(),
    ]);

    const allowed = new Set(scopedClients.map((c: any) => c.id));
    const data = mapClients.filter((c: any) => allowed.has(c.id));

    return NextResponse.json({
      success: true,
      data,
    } as APIResponse<any>);
  } catch (error: any) {
    console.error("GET /api/map error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Unauthorized" },
      { status: 401 }
    );
  }
}
