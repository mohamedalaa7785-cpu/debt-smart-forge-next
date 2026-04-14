import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getClientBundlesByIds, getClientsForUser } from "@/server/services/client.service";
import { sortClientsByPriority } from "@/server/core/priority.engine";
import { withAuth } from "@/server/lib/auth";
import { handleApiError } from "@/server/core/error.handler";

export async function GET(_req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const clients = await getClientsForUser(user.id, user.role);

      const valid = await getClientBundlesByIds(
        clients.map((c) => c.id),
        user.id,
        user.role
      );
      const sorted = sortClientsByPriority(valid);

      return NextResponse.json({
        success: true,
        data: sorted.slice(0, 20),
      });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
