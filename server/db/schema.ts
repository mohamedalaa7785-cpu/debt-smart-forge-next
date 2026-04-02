import { pgTable, uuid, text, timestamp, numeric, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* =========================
   USERS 🔥
========================= */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  password: text("password"),
  role: text("role"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   CLIENTS 👥
========================= */
export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email"),
  company: text("company"),
  notes: text("notes"),
  imageUrl: text("image_url"),
  ownerId: uuid("owner_id").references(() => users.id),
  portfolioType: text("portfolio_type"), // ACTIVE / WRITEOFF
  domainType: text("domain_type"), // FIRST / THIRD / WRITEOFF
  cycleStartDate: timestamp("cycle_start_date"),
  cycleEndDate: timestamp("cycle_end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientsRelations = relations(clients, ({ one, many }) => ({
  owner: one(users, {
    fields: [clients.ownerId],
    references: [users.id],
  }),
  phones: many(clientPhones),
  addresses: many(clientAddresses),
  loans: many(clientLoans),
  actions: many(clientActions),
  osint: one(osintResults, {
    fields: [clients.id],
    references: [osintResults.clientId],
  }),
  images: many(clientImages),
}));

/* =========================
   PHONES 📞
========================= */
export const clientPhones = pgTable("client_phones", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id),
  phone: text("phone"),
});

export const clientPhonesRelations = relations(clientPhones, ({ one }) => ({
  client: one(clients, {
    fields: [clientPhones.clientId],
    references: [clients.id],
  }),
}));

/* =========================
   ADDRESSES 📍
========================= */
export const clientAddresses = pgTable("client_addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id),
  address: text("address"),
  lat: numeric("lat"),
  lng: numeric("lng"),
});

export const clientAddressesRelations = relations(clientAddresses, ({ one }) => ({
  client: one(clients, {
    fields: [clientAddresses.clientId],
    references: [clients.id],
  }),
}));

/* =========================
   LOANS 💰
========================= */
export const clientLoans = pgTable("client_loans", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id),
  loanType: text("loan_type"),
  emi: numeric("emi"),
  balance: numeric("balance"),
  bucket: integer("bucket"),
  penaltyEnabled: boolean("penalty_enabled"),
  penaltyAmount: numeric("penalty_amount"),
  amountDue: numeric("amount_due"),
});

export const clientLoansRelations = relations(clientLoans, ({ one }) => ({
  client: one(clients, {
    fields: [clientLoans.clientId],
    references: [clients.id],
  }),
}));

/* =========================
   ACTIONS ⚡
========================= */
export const clientActions = pgTable("client_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id),
  userId: uuid("user_id").references(() => users.id),
  actionType: text("action_type"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientActionsRelations = relations(clientActions, ({ one }) => ({
  client: one(clients, {
    fields: [clientActions.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [clientActions.userId],
    references: [users.id],
  }),
}));

/* =========================
   OSINT 🔍
========================= */
export const osintResults = pgTable("osint_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id),
  social: jsonb("social"),
  workplace: jsonb("workplace"),
  webResults: jsonb("web_results"),
  imageResults: jsonb("image_results"),
  summary: text("summary"),
  confidenceScore: numeric("confidence_score"),
});

export const osintResultsRelations = relations(osintResults, ({ one }) => ({
  client: one(clients, {
    fields: [osintResults.clientId],
    references: [clients.id],
  }),
}));

/* =========================
   IMAGES 🖼️
========================= */
export const clientImages = pgTable("client_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id),
  url: text("url"),
  publicId: text("public_id"),
});

export const clientImagesRelations = relations(clientImages, ({ one }) => ({
  client: one(clients, {
    fields: [clientImages.clientId],
    references: [clients.id],
  }),
}));
