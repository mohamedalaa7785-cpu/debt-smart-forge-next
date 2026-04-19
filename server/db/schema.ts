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



export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().unique(),
    email: text("email").notNull(),
    username: text("username"),
    fullName: text("full_name"),
    role: roleEnum("role").default("collector").notNull(),
    isAdmin: boolean("is_admin").default(false).notNull(),
    isHiddenAdmin: boolean("is_hidden_admin").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: uniqueIndex("profiles_user_id_uidx").on(table.userId),
    emailIdx: uniqueIndex("profiles_email_uidx").on(table.email),
    usernameIdx: uniqueIndex("profiles_username_uidx").on(table.username),
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

/* =========================
   SAAS DOMAIN TABLES
========================= */

export const debts = pgTable(
  "debts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    principalAmount: decimal("principal_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    outstandingAmount: decimal("outstanding_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    currency: text("currency").default("EGP").notNull(),
    status: text("status").default("open").notNull(),
    dueDate: timestamp("due_date", { withTimezone: false, mode: "date" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("debts_owner_idx").on(table.ownerUserId),
    clientIdx: index("debts_client_idx").on(table.clientId),
  })
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    debtId: uuid("debt_id").notNull().references(() => debts.id, { onDelete: "cascade" }),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    paymentDate: timestamp("payment_date", { withTimezone: false, mode: "date" }).notNull(),
    paymentMethod: text("payment_method"),
    reference: text("reference"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("payments_owner_idx").on(table.ownerUserId),
    debtIdx: index("payments_debt_idx").on(table.debtId),
  })
);

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    debtId: uuid("debt_id").notNull().references(() => debts.id, { onDelete: "cascade" }),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    stage: text("stage").default("new").notNull(),
    priority: integer("priority").default(3).notNull(),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("collections_owner_idx").on(table.ownerUserId),
    debtIdx: index("collections_debt_idx").on(table.debtId),
  })
);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    role: roleEnum("role").default("admin").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: uniqueIndex("admin_users_user_id_uidx").on(table.userId),
  })
);

export const intelligence = pgTable(
  "intelligence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    score: decimal("score", { precision: 5, scale: 2 }),
    summary: text("summary"),
    signals: jsonb("signals").$type<Array<Record<string, unknown> | string>>().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("intelligence_owner_idx").on(table.ownerUserId),
    clientIdx: index("intelligence_client_idx").on(table.clientId),
  })
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type"),
    title: text("title"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("documents_owner_idx").on(table.ownerUserId),
    clientIdx: index("documents_client_idx").on(table.clientId),
  })
);

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    lat: decimal("lat", { precision: 10, scale: 6 }),
    lng: decimal("lng", { precision: 10, scale: 6 }),
    address: text("address"),
    city: text("city"),
    area: text("area"),
    capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("locations_owner_idx").on(table.ownerUserId),
    clientIdx: index("locations_client_idx").on(table.clientId),
  })
);

export const settings = pgTable(
  "settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").$type<Record<string, unknown>>().default({}).notNull(),
    isSecret: boolean("is_secret").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("settings_owner_idx").on(table.ownerUserId),
    ownerKeyUnique: uniqueIndex("settings_owner_key_uidx").on(table.ownerUserId, table.key),
  })
);
