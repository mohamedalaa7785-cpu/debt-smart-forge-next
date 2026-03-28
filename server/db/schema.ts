import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

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
   PHONES (MULTIPLE)
========================= */
export const clientPhones = pgTable("client_phones", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull(),

  phone: text("phone").notNull(),
  isPrimary: boolean("is_primary").default(false),

  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   ADDRESSES (MULTIPLE)
========================= */
export const clientAddresses = pgTable("client_addresses", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull(),

  address: text("address").notNull(),

  lat: text("lat"),
  lng: text("lng"),

  isPrimary: boolean("is_primary").default(false),

  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   LOANS (MULTIPLE)
========================= */
export const clientLoans = pgTable("client_loans", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull(),

  loanType: text("loan_type").notNull(),
  loanNumber: text("loan_number"),

  balance: text("balance").notNull(),
  emi: text("emi").notNull(),

  bucket: integer("bucket").default(1),

  penaltyEnabled: boolean("penalty_enabled").default(false),
  penaltyAmount: text("penalty_amount"),

  amountDue: text("amount_due"),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   ACTIONS (CALLS / NOTES)
========================= */
export const clientActions = pgTable("client_actions", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull(),

  actionType: text("action_type").notNull(), // call / note / promise
  note: text("note"),

  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   OSINT RESULTS
========================= */
export const osintResults = pgTable("osint_results", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull(),

  socialLinks: text("social_links"),
  workplace: text("workplace"),

  webResults: text("web_results"),
  imageResults: text("image_results"),

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

/* =========================
   TYPES (IMPORTANT)
========================= */
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

export type ClientPhone = typeof clientPhones.$inferSelect;
export type InsertClientPhone = typeof clientPhones.$inferInsert;

export type ClientAddress = typeof clientAddresses.$inferSelect;
export type InsertClientAddress = typeof clientAddresses.$inferInsert;

export type ClientLoan = typeof clientLoans.$inferSelect;
export type InsertClientLoan = typeof clientLoans.$inferInsert;

export type ClientAction = typeof clientActions.$inferSelect;
export type InsertClientAction = typeof clientActions.$inferInsert;

export type OSINTResult = typeof osintResults.$inferSelect;
export type InsertOSINTResult = typeof osintResults.$inferInsert;

export type ClientImage = typeof clientImages.$inferSelect;
export type InsertClientImage = typeof clientImages.$inferInsert;
