import { NextRequest, NextResponse } from "next/server";
import { getClientsForMap } from "@/server/services/map.service";
import { APIResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const clients = await getClientsForMap();

    return NextResponse.json({
      success: true,
      data: clients
    } as APIResponse<any>);
  } catch (error) {
    console.error("GET /api/map error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch map data" },
      { status: 500 }
    );
  }
}
