import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { db } from "@/server/db";
import { riskAnalysis, clients, clientPhones, socialProfiles, phoneIntelligence } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { getGroqClient, getGroqModel } from "@/server/lib/groq-client";

export async function POST(req: Request) {
  await requireUser();
  const { clientId } = await req.json();
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const [client] = await db.select({ name: clients.name, company: clients.company }).from(clients).where(eq(clients.id, clientId)).limit(1);
  const phones = await db.select({ phone: clientPhones.phone }).from(clientPhones).where(eq(clientPhones.clientId, clientId));
  const socials = await db.select().from(socialProfiles).where(eq(socialProfiles.clientId, clientId));
  const intel = await db.select().from(phoneIntelligence).where(eq(phoneIntelligence.clientId, clientId)).orderBy(desc(phoneIntelligence.updatedAt)).limit(1);

  const groq = getGroqClient();
  let ai: any = { riskScore: 50, fraudIndicators: ["insufficient_data"], confidenceScore: 50, customerSummary: "Limited data", identityMatchProbability: 50 };

  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        model: getGroqModel(),
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Return JSON: riskScore,fraudIndicators[],confidenceScore,customerSummary,identityMatchProbability." },
          { role: "user", content: JSON.stringify({ client, phones, socials: socials.slice(0, 10), intel: intel[0] }) },
        ],
      });
      ai = JSON.parse(completion.choices[0]?.message?.content || "{}");
    } catch {
      // deterministic fallback above
    }
  }

  const [saved] = await db.insert(riskAnalysis).values({
    clientId,
    riskScore: Number(ai.riskScore || 50),
    confidenceScore: Number(ai.confidenceScore || 50),
    fraudIndicators: ai.fraudIndicators || [],
    customerSummary: String(ai.customerSummary || ""),
    identityMatchProbability: Number(ai.identityMatchProbability || 50),
    metadata: { socials: socials.length, phones: phones.length },
  }).returning();

  return NextResponse.json(saved);
}
