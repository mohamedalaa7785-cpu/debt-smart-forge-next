import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { withAuth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients, users } from "@/server/db/schema";
import { parseBankImportInput } from "@/server/services/bank-import.service";
import { createClientFull } from "@/server/services/client.service";
import { ForbiddenError, ValidationError, handleApiError } from "@/server/core/error.handler";

type AssignMode = "single_owner" | "round_robin";

const ImportPayloadSchema = z
  .object({
    rawText: z.string().trim().optional().default(""),
    imageUrl: z.string().url().optional().default(""),
    dryRun: z.boolean().optional().default(true),
    assignMode: z.enum(["single_owner", "round_robin"]).optional().default("round_robin"),
    ownerId: z.string().uuid().optional().nullable(),
  })
  .strict();

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
    try {
      if (user.role !== "admin" && user.role !== "hidden_admin") {
        throw new ForbiddenError();
      }

      const rawBody = await req.json();
      const parsedBody = ImportPayloadSchema.safeParse(rawBody);
      if (!parsedBody.success) {
        throw new ValidationError("Invalid import payload", {
          issues: parsedBody.error.issues.map((issue) => issue.message),
        });
      }

      const { rawText, imageUrl, dryRun, assignMode, ownerId: targetOwnerId } = parsedBody.data;

      if (!rawText && !imageUrl) {
        throw new ValidationError("rawText or imageUrl is required");
      }

      const parsedClients = await parseBankImportInput({ rawText, imageUrl });

      if (!parsedClients.length) {
        return NextResponse.json(
          { success: false, error: "No clients detected from provided document" },
          { status: 422 }
        );
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
        throw new ValidationError("No assignable owners found");
      }

      const created: Array<{ id: string; name: string; ownerId: string }> = [];
      const skipped: Array<{ name: string; reason: string }> = [];
      let ownerIdx = 0;

      const candidateNames = Array.from(new Set(parsedClients.map((c) => c.name).filter(Boolean)));
      const existingByName = candidateNames.length
        ? await db.select({ id: clients.id, name: clients.name, customerId: clients.customerId }).from(clients).where(inArray(clients.name, candidateNames))
        : [];

      const duplicateSet = new Set(
        existingByName.map((c) => `${(c.name || "").toLowerCase()}::${(c.customerId || "").toLowerCase()}`)
      );

      for (const clientData of parsedClients) {
        const dedupeKey = `${(clientData.name || "").toLowerCase()}::${(clientData.customerId || "").toLowerCase()}`;
        const duplicate = duplicateSet.has(dedupeKey);

        if (duplicate) {
          skipped.push({ name: clientData.name, reason: "already_exists" });
          continue;
        }

        const owner = assignMode === "single_owner" ? owners[0] : owners[ownerIdx++ % owners.length];

        const payload = {
          ...clientData,
          ownerId: owner.id,
          teamLeaderId: owner.role === "team_leader" ? owner.id : null,
          portfolioType: "ACTIVE",
          domainType: "FIRST",
        };

        const inserted = await createClientFull(payload, user.id);
        duplicateSet.add(dedupeKey);
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
    } catch (error) {
      return handleApiError(error);
    }
  });
}
