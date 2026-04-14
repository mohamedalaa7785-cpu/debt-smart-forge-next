import { NextRequest, NextResponse } from "next/server";
import { getClientsForMap } from "@/server/services/map.service";
import { getClientsForUser } from "@/server/services/client.service";
import { withAuth } from "@/server/lib/auth";
import { APIResponse } from "@/types";
import type { MapClient } from "@/server/services/map.service";
import { handleApiError } from "@/server/core/error.handler";

export const dynamic = "force-dynamic";

type ScopedClient = { id: string };

export async function GET(_req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const [scopedClients, mapClients] = await Promise.all([getClientsForUser(user.id, user.role), getClientsForMap()]);

      const allowed = new Set((scopedClients as ScopedClient[]).map((c) => c.id));
      const data = (mapClients as MapClient[]).filter((c) => allowed.has(c.id));

      return NextResponse.json({
        success: true,
        data,
      } as APIResponse<any>);
    } catch (error) {
      return handleApiError(error);
    }
  });
}
