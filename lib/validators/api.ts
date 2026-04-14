import { z } from "zod";

export const LoginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const RegisterBodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export const ClientsListQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
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



export const UpdateClientBodySchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    email: z.string().trim().email().optional().nullable(),
    company: z.string().trim().max(160).optional().nullable(),
    notes: z.string().trim().max(4000).optional().nullable(),
    referral: z.string().trim().max(200).optional().nullable(),
    branch: z.string().trim().max(120).optional().nullable(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const AssignClientsBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  ownerId: z.string().uuid(),
});

export const BulkIdsBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const SettlementBodySchema = z.object({
  originalBalance: z.number().nonnegative(),
  haircutPercentage: z.number().min(0).max(100),
});

export const UploadBodySchema = z.object({
  file: z.string().min(20),
  folder: z.string().trim().optional(),
});

export const AdminCreateUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().max(120).optional().nullable(),
  role: z.enum(["admin", "supervisor", "team_leader", "collector", "hidden_admin"]),
});

export const AdminUpdateUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "supervisor", "team_leader", "collector", "hidden_admin"]).optional(),
  name: z.string().trim().max(120).optional().nullable(),
  password: z.string().min(8).max(128).optional(),
});

export const AdminDeleteUserSchema = z.object({
  userId: z.string().uuid(),
});


export const CreateActionBodySchema = z.object({
  clientId: z.string().uuid(),
  actionType: z.string().trim().min(1).max(50),
  note: z.string().trim().max(4000).optional().nullable(),
  result: z.string().trim().max(2000).optional().nullable(),
  amountPaid: z.union([z.string(), z.number()]).optional().nullable(),
  nextActionDate: z.string().optional().nullable(),
});

export const WhatsAppBodySchema = z.object({
  clientId: z.string().uuid(),
  phone: z.string().trim().min(6).max(32),
  message: z.string().trim().min(1).max(2000),
});


export const ClientIdBodySchema = z.object({
  clientId: z.string().uuid(),
});

export const OsintHistoryQuerySchema = z.object({
  clientId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

