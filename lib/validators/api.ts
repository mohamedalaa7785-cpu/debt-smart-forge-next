import { z } from "zod";

const emptyStringToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);
const emptyStringToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);

const OptionalTextSchema = z.preprocess(
  emptyStringToNull,
  z.string().trim().optional().nullable()
);

const OptionalEmailSchema = z.preprocess(
  emptyStringToNull,
  z.string().trim().email().optional().nullable()
);

const OptionalUuidSchema = z.preprocess(
  emptyStringToNull,
  z.string().uuid().optional().nullable()
);

const OptionalLimitedTextSchema = (max: number) =>
  z.preprocess(emptyStringToNull, z.string().trim().max(max).optional().nullable());

const OptionalUrlSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().url().optional()
);

export const LoginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const RegisterBodySchema = z.object({
  name: OptionalLimitedTextSchema(120),
  username: z.preprocess(
    emptyStringToNull,
    z.string().trim().min(3).max(50).regex(/^[a-z0-9._-]+$/i, "Username must be letters, numbers, dot, underscore, or dash").optional().nullable()
  ),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export const ClientsListQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
});
const LoanInputSchema = z.object({
  loanType: z.string().trim().min(1),
  loanNumber: OptionalTextSchema,
  cycle: z.union([z.string(), z.number()]).optional().nullable(),
  emi: z.union([z.string(), z.number()]).optional().nullable(),
  balance: z.union([z.string(), z.number()]).optional().nullable(),
  organization: OptionalTextSchema,
  willLegal: z.boolean().optional(),
  referralDate: z.string().optional().nullable(),
  collectorPercentage: z.union([z.string(), z.number()]).optional().nullable(),
  bucket: z.union([z.string(), z.number()]).optional().nullable(),
  penaltyEnabled: z.boolean().optional(),
  penaltyAmount: z.union([z.string(), z.number()]).optional().nullable(),
});

const AddressInputSchema = z.object({
  address: z.string().trim().min(1),
  city: OptionalTextSchema,
  area: OptionalTextSchema,
});

export const CreateClientBodySchema = z.object({
  name: z.string().trim().min(1),
  email: OptionalEmailSchema,
  company: OptionalTextSchema,
  branch: OptionalTextSchema,
  notes: OptionalTextSchema,
  referral: OptionalTextSchema,
  referralText: OptionalTextSchema,
  referralImageUrl: OptionalTextSchema,
  status: OptionalTextSchema,
  portfolioType: z.enum(["ACTIVE", "WRITEOFF"]).optional(),
  domainType: z.enum(["FIRST", "THIRD", "WRITEOFF"]).optional(),
  phones: z.array(z.string().trim().min(3)).min(1),
  addresses: z.array(AddressInputSchema).optional(),
  loans: z.array(LoanInputSchema).min(1),
  ownerId: OptionalUuidSchema,
  teamLeaderId: OptionalUuidSchema,
});



export const UpdateClientBodySchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    email: OptionalEmailSchema,
    company: OptionalLimitedTextSchema(160),
    notes: OptionalLimitedTextSchema(4000),
    referral: OptionalLimitedTextSchema(200),
    branch: OptionalLimitedTextSchema(120),
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
  name: OptionalLimitedTextSchema(120),
  role: z.enum(["admin", "supervisor", "team_leader", "collector", "hidden_admin"]),
});

export const AdminUpdateUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "supervisor", "team_leader", "collector", "hidden_admin"]).optional(),
  name: OptionalLimitedTextSchema(120),
  password: z.string().min(8).max(128).optional(),
});

export const AdminDeleteUserSchema = z.object({
  userId: z.string().uuid(),
});


export const CreateActionBodySchema = z.object({
  clientId: z.string().uuid(),
  actionType: z.string().trim().min(1).max(50),
  note: OptionalLimitedTextSchema(4000),
  result: OptionalLimitedTextSchema(2000),
  amountPaid: z.union([z.string(), z.number()]).optional().nullable(),
  nextActionDate: OptionalTextSchema,
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



export const SearchClientsQuerySchema = z.object({
  q: z.string().trim().min(2).max(160),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const PhoneLookupQuerySchema = z.object({
  phone: z.string().trim().min(6).max(32),
});

export const UploadImageBodySchema = z.object({
  imageBase64: z.string().min(64),
  clientId: OptionalUuidSchema,
  title: OptionalLimitedTextSchema(160),
});

export const SearchByImageBodySchema = z.object({
  imageBase64: z.string().min(64).optional(),
  imageUrl: OptionalUrlSchema,
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
}).refine((data) => Boolean(data.imageBase64 || data.imageUrl), {
  message: "imageBase64 or imageUrl is required",
});

export const FaceMatchBodySchema = z.object({
  imageBase64A: z.string().min(64),
  imageBase64B: z.string().min(64),
});
