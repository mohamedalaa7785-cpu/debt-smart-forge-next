import { NextResponse } from "next/server";
import { runOSINT } from "@/server/services/osint.service";

/* =========================
   POST OSINT
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    /* =========================
       VALIDATION
    ========================= */
    if (!body.name && !body.phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Name or phone required",
        },
        { status: 400 }
      );
    }

    /* =========================
       RUN OSINT
    ========================= */
    const result = await runOSINT({
      name: body.name,
      phone: body.phone,
      company: body.company,
      city: body.city,
      imageUrl: body.imageUrl,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("OSINT ERROR:", error);

    return NextResponse.json(
      { success: false, error: "OSINT failed" },
      { status: 500 }
    );
  }
}
