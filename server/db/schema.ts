import { pgTable, uuid, text, timestamp, numeric, integer, boolean, jsonb, date } from "drizzle-orm/pg-core";
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
  customerId: text("customer_id").unique(),
  email: text("email"),
  company: text("company"),
  notes: text("notes"),
  imageUrl: text("image_url"),
  ownerId: uuid("owner_id").references(() => users.id),
  portfolioType: text("portfolio_type"), // ACTIVE / WRITEOFF
  domainType: text("domain_type"), // FIRST / THIRD / WRITEOFF
  branch: text("branch"),
  cycleStartDate: date("cycle_start_date"),
  cycleEndDate: date("cycle_end_date"),
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
  callLogs: many(callLogs),
  followups: many(followups),
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
  city: text("city"),
  area: text("area"),
  lat: numeric("lat"),
  lng: numeric("lng"),
  isPrimary: boolean("is_primary").default(false),
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
  overdue: numeric("overdue"),
  bucket: integer("bucket"),
  penaltyEnabled: boolean("penalty_enabled").default(false),
  penaltyAmount: numeric("penalty_amount").default("0"),
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
  actionType: text("action_type"), // CALL, VISIT, WHATSAPP, etc.
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

/* =========================
   AUDIT LOGS 📋
========================= */
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  action: text("action"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   CALL LOGS 📞
========================= */
export const callLogs = pgTable("call_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id),
  userId: uuid("user_id").references(() => users.id),
  callStatus: text("call_status"), // answered, no_answer, promised, refused, etc.
  duration: integer("duration"), // in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const callLogsRelations = relations(callLogs, ({ one }) => ({
  client: one(clients, {
    fields: [callLogs.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [callLogs.userId],
    references: [users.id],
  }),
}));

/* =========================
   FOLLOW-UPS 📅
========================= */
export const followups = pgTable("followups", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id),
  scheduledFor: date("scheduled_for"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const followupsRelations = relations(followups, ({ one }) => ({
  client: one(clients, {
    fields: [followups.clientId],
    references: [clients.id],
  }),
}));
