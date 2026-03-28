import { NextResponse } from "next/server";
import {
  createClient,
  getAllClients,
  searchClients,
} from "@/server/services/client.service";

/* =========================
   GET CLIENTS (ALL / SEARCH)
========================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (query && query.trim()) {
      const results = await searchClients(query);
      return NextResponse.json(results);
    }

    const clients = await getAllClients();
    return NextResponse.json(clients);
  } catch (error) {
    console.error("GET /clients error:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

/* =========================
   CREATE CLIENT (FULL DATA)
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Client name is required" },
        { status: 400 }
      );
    }

    const client = await createClient({
      name: body.name,
      email: body.email,
      company: body.company,
      notes: body.notes,
      imageUrl: body.imageUrl,

      phones: body.phones || [],
      addresses: body.addresses || [],
      loans: body.loans || [],
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("POST /clients error:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
       }
