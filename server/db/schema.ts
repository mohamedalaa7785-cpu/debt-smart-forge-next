import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* =========================
   PHONES
========================= */
export const clientPhones = pgTable("client_phones", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  phone: text("phone").notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* =========================
   ADDRESSES
========================= */
export const clientAddresses = pgTable("client_addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  address: text("address").notNull(),
  lat: numeric("lat"),
  lng: numeric("lng"),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* =========================
   LOANS
========================= */
export const clientLoans = pgTable("client_loans", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),

  loanType: text("loan_type").notNull(), // PIL / VSBL / AUTO / CC / WRITEOFF
  loanNumber: text("loan_number"),

  balance: numeric("balance").notNull().default("0"),
  emi: numeric("emi").notNull().default("0"),

  bucket: integer("bucket").notNull().default(1),

  penaltyEnabled: boolean("penalty_enabled").default(false).notNull(),
  penaltyAmount: numeric("penalty_amount").default("0").notNull(),

  amountDue: numeric("amount_due").notNull().default("0"),

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* =========================
   ACTIONS
========================= */
export const clientActions = pgTable("client_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),

  actionType: text("action_type").notNull(), // call / paid / follow / no_answer / note
  note: text("note"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* =========================
   OSINT RESULTS
========================= */
export const osintResults = pgTable("osint_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),

  socialLinks: text("social_links"),
  workplace: text("workplace"),
  webResults: text("web_results"),
  imageResults: text("image_results"),
  summary: text("summary"),
  confidenceScore: integer("confidence_score").default(0).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* =========================
   IMAGE ASSETS
========================= */
export const clientImages = pgTable("client_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),

  url: text("url").notNull(),
  publicId: text("public_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* =========================
   TYPES
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
