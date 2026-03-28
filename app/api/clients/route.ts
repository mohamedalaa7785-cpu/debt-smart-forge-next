import { NextResponse } from "next/server";
import {
  getAllClients,
  createClientFull,
} from "@/server/services/client.service";

import { normalizePhone } from "@/lib/utils";

/* =========================
   VALIDATION HELPERS
========================= */
function validateClientBody(body: any) {
  if (!body.name || typeof body.name !== "string") {
    return "Name is required";
  }

  if (!Array.isArray(body.phones) || body.phones.length === 0) {
    return "At least one phone is required";
  }

  if (!Array.isArray(body.loans) || body.loans.length === 0) {
    return "At least one loan is required";
  }

  return null;
}

/* =========================
   SANITIZE INPUT
========================= */
function sanitizeBody(body: any) {
  return {
    name: body.name?.trim(),
    email: body.email?.trim() || null,
    company: body.company?.trim() || null,

    phones: (body.phones || [])
      .map((p: string) => normalizePhone(p))
      .filter(Boolean),

    addresses: (body.addresses || [])
      .map((a: string) => a.trim())
      .filter(Boolean),

    loans: (body.loans || []).map((l: any) => ({
      loanType: l.loanType,
      emi: Number(l.emi) || 0,
      balance: Number(l.balance) || 0,
    })),
  };
}

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
    const validationError = validateClientBody(body);

    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: validationError,
        },
        { status: 400 }
      );
    }

    /* =========================
       SANITIZATION 🔥
    ========================= */
    const cleanData = sanitizeBody(body);

    /* =========================
       EXTRA SAFETY
    ========================= */
    if (cleanData.phones.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid phone numbers",
        },
        { status: 400 }
      );
    }

    /* =========================
       CREATE CLIENT
    ========================= */
    const client = await createClientFull(cleanData);

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
