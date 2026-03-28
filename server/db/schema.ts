import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";

/* =========================
   USERS 🔐
========================= */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  email: text("email").notNull().unique(),
  password: text("password").notNull(),

  role: text("role").default("agent"),

  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   SESSIONS
========================= */
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id").notNull(),
  token: text("token").unique(),

  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   LOGS 📊
========================= */
export const logs = pgTable("logs", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id"),
  action: text("action"),
  meta: jsonb("meta"),

  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   CLIENTS
========================= */
export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  email: text("email"),
  company: text("company"),
  notes: text("notes"),

  imageUrl: text("image_url"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/* =========================
   PHONES
========================= */
export const clientPhones = pgTable("client_phones", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull(),

  phone: text("phone").notNull(),
  isPrimary: boolean("is_primary").default(false),

  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   ADDRESSES
========================= */
export const clientAddresses = pgTable("client_addresses", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull(),

  address: text("address").notNull(),

  lat: numeric("lat"),
  lng: numeric("lng"),

  isPrimary: boolean("is_primary").default(false),

  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   LOANS 🔥
========================= */
export const clientLoans = pgTable("client_loans", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull(),

  loanType: text("loan_type").notNull(),
  loanNumber: text("loan_number"),

  balance: numeric("balance").notNull(),
  emi: numeric("emi").notNull(),

  bucket: integer("bucket").default(1),

  penaltyEnabled: boolean("penalty_enabled").default(false),
  penaltyAmount: numeric("penalty_amount"),

  amountDue: numeric("amount_due"),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   ACTIONS
========================= */
export const clientActions = pgTable("client_actions", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull(),

  actionType: text("action_type").notNull(),
  note: text("note"),

  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   OSINT 🔍
========================= */
export const osintResults = pgTable("osint_results", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull(),

  socialLinks: jsonb("social_links"),
  workplace: jsonb("workplace"),

  webResults: jsonb("web_results"),
  imageResults: jsonb("image_results"),

  summary: text("summary"),
  confidenceScore: integer("confidence_score"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/* =========================
   IMAGES
========================= */
export const clientImages = pgTable("client_images", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull(),

  imageUrl: text("image_url").notNull(),
  publicId: text("public_id"),

  createdAt: timestamp("created_at").defaultNow(),
});
