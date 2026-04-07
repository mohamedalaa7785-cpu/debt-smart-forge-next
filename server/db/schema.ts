import { pgTable, text, timestamp, boolean, decimal, integer, jsonb, uuid, pgEnum } from "drizzle-orm/pg-core";

/* =========================
   ENUMS
========================= */
export const roleEnum = pgEnum("user_role", ["admin", "supervisor", "team_leader", "collector", "hidden_admin"]);

/* =========================
   USERS 👤
========================= */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: text("role").default("collector"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* =========================
   CLIENTS 👥
========================= */
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: text("customer_id").unique(),
  name: text("name").notNull(),
  email: text("email"),
  company: text("company"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  ownerId: uuid("owner_id").references(() => users.id),
  teamLeaderId: uuid("team_leader_id").references(() => users.id),
  portfolioType: text("portfolio_type").default("ACTIVE"),
  domainType: text("domain_type").default("FIRST"),
  branch: text("branch"),
  cycleStartDate: timestamp("cycle_start_date", { withTimezone: true }),
  cycleEndDate: timestamp("cycle_end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* =========================
   CLIENT PHONES 📞
========================= */
export const clientPhones = pgTable("client_phones", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  phone: text("phone").notNull(),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* =========================
   CLIENT ADDRESSES 📍
========================= */
export const clientAddresses = pgTable("client_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  address: text("address").notNull(),
  city: text("city"),
  area: text("area"),
  lat: text("lat"),
  lng: text("lng"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* =========================
   CLIENT LOANS 💰
========================= */
export const clientLoans = pgTable("client_loans", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  loanType: text("loan_type").notNull(),
  emi: decimal("emi", { precision: 12, scale: 2 }),
  balance: decimal("balance", { precision: 12, scale: 2 }),
  overdue: decimal("overdue", { precision: 12, scale: 2 }),
  bucket: integer("bucket").default(1),
  amountDue: decimal("amount_due", { precision: 12, scale: 2 }),
  penaltyEnabled: boolean("penalty_enabled").default(false),
  penaltyAmount: decimal("penalty_amount", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* =========================
   CLIENT ACTIONS 📅
========================= */
export const clientActions = pgTable("client_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  actionType: text("action_type").notNull(),
  note: text("note"),
  result: text("result"),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }),
  nextActionDate: timestamp("next_action_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* =========================
   OSINT RESULTS 🔍
========================= */
export const osintResults = pgTable("osint_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id).notNull().unique(),
  social: jsonb("social"),
  workplace: jsonb("workplace"),
  webResults: jsonb("web_results"),
  imageResults: jsonb("image_results"),
  summary: text("summary"),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* =========================
   CALL LOGS 📞
========================= */
export const callLogs = pgTable("call_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  phone: text("phone").notNull(),
  duration: integer("duration"),
  recordingUrl: text("recording_url"),
  summary: text("summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* =========================
   FOLLOWUPS ⏰
========================= */
export const followups = pgTable("followups", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* =========================
   SYSTEM LOGS 📝
========================= */
export const logs = pgTable("logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* =========================
   LEGAL CASES ⚖️
========================= */
export const legalCases = pgTable("legal_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  caseNumber: text("case_number").unique(),
  caseType: text("case_type"),
  status: text("status").default("pending"),
  lastUpdate: text("last_update"),
  courtDate: timestamp("court_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
