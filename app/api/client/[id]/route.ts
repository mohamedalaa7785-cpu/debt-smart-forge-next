import { NextResponse } from "next/server";
import { getClientById } from "@/server/services/client.service";

/* =========================
   GET FULL CLIENT PROFILE 🔥
========================= */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;

    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          error: "Client ID is required",
        },
        { status: 400 }
      );
    }

    /* =========================
       CORE SYSTEM CALL
    ========================= */
    const data = await getClientById(clientId);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Client not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("GET CLIENT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch client",
      },
      { status: 500 }
    );
  }
                  }
