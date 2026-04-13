import { z } from "zod";

export const LoginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const LoanInputSchema = z.object({
  loanType: z.string().trim().min(1),
  loanNumber: z.string().trim().optional().nullable(),
  cycle: z.union([z.string(), z.number()]).optional().nullable(),
  emi: z.union([z.string(), z.number()]).optional().nullable(),
  balance: z.union([z.string(), z.number()]).optional().nullable(),
  organization: z.string().trim().optional().nullable(),
  willLegal: z.boolean().optional(),
  referralDate: z.string().optional().nullable(),
  collectorPercentage: z.union([z.string(), z.number()]).optional().nullable(),
  bucket: z.union([z.string(), z.number()]).optional().nullable(),
  penaltyEnabled: z.boolean().optional(),
  penaltyAmount: z.union([z.string(), z.number()]).optional().nullable(),
});

const AddressInputSchema = z.object({
  address: z.string().trim().min(1),
  city: z.string().trim().optional().nullable(),
  area: z.string().trim().optional().nullable(),
});

export const CreateClientBodySchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().optional().nullable(),
  company: z.string().trim().optional().nullable(),
  branch: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  referral: z.string().trim().optional().nullable(),
  portfolioType: z.enum(["ACTIVE", "WRITEOFF"]).optional(),
  domainType: z.enum(["FIRST", "THIRD", "WRITEOFF"]).optional(),
  phones: z.array(z.string().trim().min(3)).min(1),
  addresses: z.array(AddressInputSchema).optional(),
  loans: z.array(LoanInputSchema).min(1),
  ownerId: z.string().uuid().optional().nullable(),
  teamLeaderId: z.string().uuid().optional().nullable(),
});
