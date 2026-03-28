import { NextResponse } from "next/server";
import { getAllClients, createClientFull } from "@/server/services/client.service";

/* =========================
   GET ALL CLIENTS
========================= */
export async function GET() {
  try {
    const clients = await getAllClients();

    return NextResponse.json({
      success: true,
      data: clients,
    });
  } catch (error) {
    console.error("GET CLIENTS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch clients",
      },
      { status: 500 }
    );
  }
}

/* =========================
   CREATE CLIENT (FULL SYSTEM)
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    /* =========================
       VALIDATION
    ========================= */
    if (!body.name) {
      return NextResponse.json(
        {
          success: false,
          error: "Name is required",
        },
        { status: 400 }
      );
    }

    if (!body.phones || body.phones.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one phone is required",
        },
        { status: 400 }
      );
    }

    if (!body.loans || body.loans.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one loan is required",
        },
        { status: 400 }
      );
    }

    /* =========================
       CREATE CLIENT
    ========================= */
    const client = await createClientFull({
      name: body.name,
      email: body.email,
      company: body.company,

      phones: body.phones || [],
      addresses: body.addresses || [],

      loans: body.loans || [],
    });

    return NextResponse.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error("CREATE CLIENT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create client",
      },
      { status: 500 }
    );
  }
        }
