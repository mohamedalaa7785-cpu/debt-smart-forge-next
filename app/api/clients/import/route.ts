import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { withAuth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients, users } from "@/server/db/schema";
import { parseBankImportInput } from "@/server/services/bank-import.service";
import { createClientFull } from "@/server/services/client.service";

type AssignMode = "single_owner" | "round_robin";

async function getAssignableOwners(ownerId?: string | null) {
  if (ownerId) {
    const one = await db.query.users.findFirst({ where: eq(users.id, ownerId) });
    return one ? [one] : [];
  }

  return db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(inArray(users.role, ["collector", "team_leader", "admin"]));
}

function summarize(client: any) {
  const totalBalance = client.loans.reduce((sum: number, l: any) => sum + Number(l.balance || 0), 0);
  const totalOverdue = client.loans.reduce((sum: number, l: any) => sum + Number(l.overdue || 0), 0);
  const totalAmountDue = client.loans.reduce((sum: number, l: any) => sum + Number(l.amountDue || 0), 0);

  return {
    ...client,
    totalBalance,
    totalOverdue,
    totalAmountDue,
  };
}

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    const body = await req.json();

    const rawText = typeof body.rawText === "string" ? body.rawText : "";
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
    const dryRun = body.dryRun !== false;
    const assignMode: AssignMode = body.assignMode === "single_owner" ? "single_owner" : "round_robin";
    const targetOwnerId = typeof body.ownerId === "string" ? body.ownerId : null;

    if (!rawText && !imageUrl) {
      return NextResponse.json(
        { success: false, error: "rawText or imageUrl is required" },
        { status: 400 }
      );
    }

    const parsedClients = await parseBankImportInput({ rawText, imageUrl });

    if (!parsedClients.length) {
      return NextResponse.json({
        success: false,
        error: "No clients detected from provided document",
      }, { status: 422 });
    }

    const summarized = parsedClients.map(summarize);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        data: {
          count: summarized.length,
          clients: summarized,
        },
      });
    }

    const owners = await getAssignableOwners(targetOwnerId);

    if (!owners.length) {
      return NextResponse.json(
        { success: false, error: "No assignable owners found" },
        { status: 400 }
      );
    }

    const created: Array<{ id: string; name: string; ownerId: string }> = [];
    const skipped: Array<{ name: string; reason: string }> = [];

    let ownerIdx = 0;

    for (const clientData of parsedClients) {
      const maybeDuplicates = await db.query.clients.findMany({
        where: eq(clients.name, clientData.name),
      });

      const duplicate = maybeDuplicates.find((c) =>
        (c.customerId || "") === (clientData.customerId || "")
      );

      if (duplicate) {
        skipped.push({ name: clientData.name, reason: "already_exists" });
        continue;
      }

      const owner = assignMode === "single_owner"
        ? owners[0]
        : owners[ownerIdx++ % owners.length];

      const payload = {
        ...clientData,
        ownerId: owner.id,
        teamLeaderId: owner.role === "team_leader" ? owner.id : null,
        portfolioType: "ACTIVE",
        domainType: "FIRST",
      };

      const inserted = await createClientFull(payload, user.id);
      created.push({ id: inserted.id, name: inserted.name, ownerId: owner.id });
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      data: {
        parsed: summarized.length,
        createdCount: created.length,
        skippedCount: skipped.length,
        created,
        skipped,
      },
    });
  });
}
