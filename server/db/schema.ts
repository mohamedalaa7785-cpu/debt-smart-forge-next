// server/db/schema.ts

import {
  pgTable,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  jsonb,
  uuid,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* =========================
   ENUMS
========================= */

export const roleEnum = pgEnum("user_role", [
  "admin",
  "supervisor",
  "team_leader",
  "collector",
  "hidden_admin",
]);

export const portfolioEnum = pgEnum("portfolio_type", ["ACTIVE", "WRITEOFF"]);
export const domainEnum = pgEnum("domain_type", ["FIRST", "THIRD", "WRITEOFF"]);

/* =========================
   USERS
========================= */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().notNull(),

    email: text("email"),

    name: text("name"),

    role: roleEnum("role").default("collector").notNull(),

    isSuperUser: boolean("is_super_user").default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    emailUnique: uniqueIndex("users_email_uidx").on(table.email),
  })
);

/* =========================
   CLIENTS
========================= */

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    customerId: text("customer_id").unique(),

    name: text("name").notNull(),
    email: text("email"),
    company: text("company"),
    imageUrl: text("image_url"),
    notes: text("notes"),
    referral: text("referral"),

    ownerId: uuid("owner_id").references(() => users.id),
    teamLeaderId: uuid("team_leader_id").references(() => users.id),
    createdBy: uuid("created_by").references(() => users.id),

    portfolioType: portfolioEnum("portfolio_type").default("ACTIVE").notNull(),
    domainType: domainEnum("domain_type").default("FIRST").notNull(),

    branch: text("branch"),

    cycleStartDate: timestamp("cycle_start_date", { withTimezone: true }),
    cycleEndDate: timestamp("cycle_end_date", { withTimezone: true }),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    ownerIdx: index("clients_owner_idx").on(table.ownerId),
    teamIdx: index("clients_team_idx").on(table.teamLeaderId),
    createdByIdx: index("clients_created_by_idx").on(table.createdBy),
    createdAtIdx: index("clients_created_at_idx").on(table.createdAt),
  })
);

/* =========================
   CLIENT PHONES
========================= */

export const clientPhones = pgTable(
  "client_phones",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),

    phone: text("phone").notNull(),
    isPrimary: boolean("is_primary").default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    clientIdx: index("phones_client_idx").on(table.clientId),
  })
);

/* =========================
   CLIENT ADDRESSES
========================= */

export const clientAddresses = pgTable(
  "client_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),

    address: text("address").notNull(),
    city: text("city"),
    area: text("area"),

    lat: decimal("lat", { precision: 10, scale: 6 }),
    lng: decimal("lng", { precision: 10, scale: 6 }),

    isPrimary: boolean("is_primary").default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    clientIdx: index("addresses_client_idx").on(table.clientId),
  })
);

/* =========================
   CLIENT LOANS
========================= */

export const clientLoans = pgTable(
  "client_loans",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),

    loanType: text("loan_type").notNull(),
    loanNumber: text("loan_number"),
    cycle: integer("cycle"),
    organization: text("organization"),
    willLegal: boolean("will_legal").default(false),
    referralDate: timestamp("referral_date", { withTimezone: true }),
    collectorPercentage: decimal("collector_percentage", {
      precision: 6,
      scale: 2,
    }),

    emi: decimal("emi", { precision: 12, scale: 2 }),
    balance: decimal("balance", { precision: 12, scale: 2 }),
    overdue: decimal("overdue", { precision: 12, scale: 2 }),
    amountDue: decimal("amount_due", { precision: 12, scale: 2 }),

    bucket: integer("bucket").default(1),

    penaltyEnabled: boolean("penalty_enabled").default(false),
    penaltyAmount: decimal("penalty_amount", {
      precision: 12,
      scale: 2,
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    clientIdx: index("loans_client_idx").on(table.clientId),
  })
);

/* =========================
   CLIENT ACTIONS
========================= */

export const clientActions = pgTable(
  "client_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),

    userId: uuid("user_id").references(() => users.id),

    actionType: text("action_type").default("NOTE").notNull(),
    note: text("note"),
    result: text("result"),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }),
    nextActionDate: timestamp("next_action_date", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    clientIdx: index("actions_client_idx").on(table.clientId),
    userIdx: index("actions_user_idx").on(table.userId),
  })
);

/* =========================
   CALL LOGS
========================= */

export const callLogs = pgTable(
  "call_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),

    userId: uuid("user_id").references(() => users.id),

    status: text("status"),
    durationSec: integer("duration_sec"),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    clientIdx: index("call_logs_client_idx").on(table.clientId),
  })
);

/* =========================
   FOLLOWUPS
========================= */

export const followups = pgTable(
  "followups",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),

    userId: uuid("user_id").references(() => users.id),

    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    note: text("note"),
    done: boolean("done").default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    clientIdx: index("followups_client_idx").on(table.clientId),
    scheduledIdx: index("followups_scheduled_idx").on(table.scheduledFor),
  })
);

/* =========================
   OSINT RESULTS
========================= */

export const osintResults = pgTable(
  "osint_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull()
      .unique(),

    social: jsonb("social").$type<string[]>().default([]),
    workplace: jsonb("workplace").$type<string[]>().default([]),
    webResults: jsonb("web_results").$type<string[]>().default([]),
    imageResults: jsonb("image_results").$type<string[]>().default([]),
    mapsResults: jsonb("maps_results").$type<string[]>().default([]),

    summary: text("summary"),

    confidenceScore: integer("confidence_score").default(0),

    riskLevel: text("risk_level").default("low"),
    fraudFlags: jsonb("fraud_flags").$type<string[]>().default([]),

    lastAnalyzedAt: timestamp("last_analyzed_at", {
      withTimezone: true,
    }).defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    }).defaultNow(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => ({
    clientIdx: index("osint_client_idx").on(table.clientId),
    confidenceIdx: index("osint_confidence_idx").on(table.confidenceScore),
  })
);

/* =========================
   OSINT HISTORY
========================= */

export const osintHistory = pgTable(
  "osint_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),

    result: jsonb("result").$type<any>().default({}),

    confidence: integer("confidence").default(0),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => ({
    clientIdx: index("osint_history_client_idx").on(table.clientId),
  })
);

/* =========================
   FRAUD ANALYSIS
========================= */

export const fraudAnalysis = pgTable(
  "fraud_analysis",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),

    score: integer("score").default(0),

    level: text("level").default("low"),

    signals: jsonb("signals").$type<string[]>().default([]),

    aiSummary: text("ai_summary"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => ({
    clientIdx: index("fraud_client_idx").on(table.clientId),
    scoreIdx: index("fraud_score_idx").on(table.score),
  })
);

/* =========================
   LEGAL CASES
========================= */

export const legalCases = pgTable(
  "legal_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),

    caseNumber: text("case_number"),
    caseType: text("case_type"),
    status: text("status"),
    lastUpdate: text("last_update"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    clientIdx: index("legal_cases_client_idx").on(table.clientId),
  })
);

/* =========================
   AUDIT LOGS
========================= */

export const logs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id").references(() => users.id),
    clientId: uuid("client_id").references(() => clients.id),

    action: text("action").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("audit_logs_user_idx").on(table.userId),
    clientIdx: index("audit_logs_client_idx").on(table.clientId),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  })
);
