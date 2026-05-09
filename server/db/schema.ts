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
   IMPORT BATCHES
========================= */

export const importBatches = pgTable("import_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  source: text("source"),
  rawDataUrl: text("raw_data_url"),
  status: text("status").default("pending"),
  createdBy: uuid("created_by").references(() => users.id),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

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
    referralText: text("referral_text"),
    referralImageUrl: text("referral_image_url"),
    status: text("status").default("NEW"),
    importBatchId: uuid("import_batch_id").references(() => importBatches.id),

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
    statusIdx: index("idx_clients_status").on(table.status),
  })
);

/* =========================
   DOCUMENTS
========================= */

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id").references(() => users.id),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  intelligenceId: uuid("intelligence_id"),
  storagePath: text("storage_path").notNull(),
  title: text("title"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

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
   CLIENT NOTES
========================= */

export const clientNotes = pgTable("client_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id").references(() => users.id),
  content: text("content").notNull(),
  isImportant: boolean("is_important").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  clientIdx: index("idx_notes_client_id").on(table.clientId),
}));

/* =========================
   ASSIGNMENTS
========================= */

export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull(),
  ownerId: uuid("owner_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  assignedBy: uuid("assigned_by").references(() => users.id),
  status: text("status").default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  ownerIdx: index("idx_assignments_owner_id").on(table.ownerId),
}));

/* =========================
   RISK SCORES
========================= */

export const riskScores = pgTable("risk_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull(),
  score: integer("score").notNull(),
  reason: text("reason"),
  category: text("category"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  clientIdx: index("idx_risk_scores_client_id").on(table.clientId),
}));

/* =========================
   ATTACHMENTS
========================= */

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id").references(() => users.id),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  category: text("category"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  clientIdx: index("idx_attachments_client_id").on(table.clientId),
}));

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
    lastAnalyzedAt: timestamp("last_analyzed_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
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
    type: text("type").notNull(),
    query: text("query"),
    result: jsonb("result").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
      .notNull()
      .unique(),
    score: integer("score").notNull(),
    level: text("level").notNull(),
    signals: jsonb("signals").$type<string[]>().default([]),
    aiSummary: text("ai_summary"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clientIdx: index("fraud_client_idx").on(table.clientId),
  })
);

/* =========================
   AUDIT LOGS
========================= */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    clientId: uuid("client_id").references(() => clients.id),
    action: text("action").notNull(),
    meta: jsonb("meta").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("audit_logs_user_id_idx").on(table.userId),
    clientIdx: index("audit_logs_client_id_idx").on(table.clientId),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  })
);
