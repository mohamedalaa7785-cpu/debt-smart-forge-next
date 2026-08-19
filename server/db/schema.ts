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

export const phoneIntelligence = pgTable(
  "phone_intelligence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
    phone: text("phone").notNull(),
    fullName: text("full_name"),
    country: text("country"),
    carrier: text("carrier"),
    whatsappAvailable: boolean("whatsapp_available").default(false).notNull(),
    telegramAvailable: boolean("telegram_available").default(false).notNull(),
    spamScore: integer("spam_score").default(0).notNull(),
    confidenceScore: integer("confidence_score").default(0).notNull(),
    possibleAliases: jsonb("possible_aliases").$type<string[]>().default([]),
    tags: jsonb("tags").$type<string[]>().default([]),
    profileImage: text("profile_image"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clientIdx: index("phone_intelligence_client_idx").on(table.clientId),
    phoneIdx: index("phone_intelligence_phone_idx").on(table.phone),
  })
);

export const socialProfiles = pgTable(
  "social_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
    platform: text("platform").notNull(),
    profileUrl: text("profile_url").notNull(),
    title: text("title"),
    snippet: text("snippet"),
    confidenceScore: integer("confidence_score").default(0).notNull(),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clientIdx: index("social_profiles_client_idx").on(table.clientId),
  })
);

export const osintSearchLogs = pgTable(
  "osint_search_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
    searchType: text("search_type").notNull(),
    query: text("query").notNull(),
    status: text("status").default("ok").notNull(),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clientIdx: index("osint_search_logs_client_idx").on(table.clientId),
  })
);



export const identityMatches = pgTable(
  "identity_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
    platform: text("platform").notNull(),
    profileUrl: text("profile_url").notNull(),
    confidenceScore: integer("confidence_score").default(0).notNull(),
    identityProbability: integer("identity_probability").default(0).notNull(),
    fraudIndicators: jsonb("fraud_indicators").$type<string[]>().default([]),
    matchedFields: jsonb("matched_fields").$type<string[]>().default([]),
    reasoning: jsonb("reasoning").$type<string[]>().default([]),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clientIdx: index("identity_matches_client_idx").on(table.clientId),
  })
);

export const riskAnalysis = pgTable(
  "risk_analysis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
    riskScore: integer("risk_score").notNull(),
    confidenceScore: integer("confidence_score").notNull(),
    fraudIndicators: jsonb("fraud_indicators").$type<string[]>().default([]),
    customerSummary: text("customer_summary"),
    identityMatchProbability: integer("identity_match_probability").default(0).notNull(),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clientIdx: index("risk_analysis_client_idx").on(table.clientId),
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
    status: text("status").default("pending"),
    lastUpdate: text("last_update"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clientIdx: index("legal_client_idx").on(table.clientId),
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

/* =========================
   AUTONOMY CONTROL PLANE
========================= */

export const autonomyGoals = pgTable(
  "autonomy_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").references(() => users.id).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").default("active").notNull(),
    cadence: text("cadence").default("daily").notNull(),
    riskLevel: text("risk_level").default("low").notNull(),
    config: jsonb("config").default({}),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("autonomy_goals_owner_idx").on(table.ownerId),
    statusIdx: index("autonomy_goals_status_idx").on(table.status),
  })
);

export const autonomyRuns = pgTable(
  "autonomy_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    goalId: uuid("goal_id").references(() => autonomyGoals.id, { onDelete: "cascade" }).notNull(),
    ownerId: uuid("owner_id").references(() => users.id).notNull(),
    status: text("status").default("queued").notNull(),
    trigger: text("trigger").default("manual").notNull(),
    summary: text("summary"),
    findings: jsonb("findings").default([]),
    requiresApproval: boolean("requires_approval").default(true).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("autonomy_runs_owner_idx").on(table.ownerId),
    goalIdx: index("autonomy_runs_goal_idx").on(table.goalId),
    createdIdx: index("autonomy_runs_created_idx").on(table.createdAt),
  })
);

export const autonomyTasks = pgTable(
  "autonomy_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id").references(() => autonomyRuns.id, { onDelete: "cascade" }).notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    status: text("status").default("proposed").notNull(),
    priority: integer("priority").default(50).notNull(),
    payload: jsonb("payload").default({}),
    result: jsonb("result").default({}),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    runIdx: index("autonomy_tasks_run_idx").on(table.runId),
    statusIdx: index("autonomy_tasks_status_idx").on(table.status),
  })
);

export const contentDrafts = pgTable(
  "content_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").references(() => users.id).notNull(),
    taskId: uuid("task_id").references(() => autonomyTasks.id, { onDelete: "set null" }),
    platform: text("platform").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: text("status").default("draft").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("content_drafts_owner_idx").on(table.ownerId),
    statusIdx: index("content_drafts_status_idx").on(table.status),
    scheduleIdx: index("content_drafts_schedule_idx").on(table.scheduledFor),
  })
);

export const socialChannels = pgTable(
  "social_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").references(() => users.id).notNull(),
    platform: text("platform").notNull(),
    displayName: text("display_name").notNull(),
    externalAccountId: text("external_account_id"),
    secretRef: text("secret_ref"),
    status: text("status").default("draft").notNull(),
    dryRunOnly: boolean("dry_run_only").default(true).notNull(),
    config: jsonb("config").default({}),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("social_channels_owner_idx").on(table.ownerId),
    platformIdx: index("social_channels_platform_idx").on(table.platform),
    statusIdx: index("social_channels_status_idx").on(table.status),
  })
);

export const publishJobs = pgTable(
  "publish_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").references(() => users.id).notNull(),
    channelId: uuid("channel_id").references(() => socialChannels.id, { onDelete: "cascade" }).notNull(),
    draftId: uuid("draft_id").references(() => contentDrafts.id, { onDelete: "cascade" }).notNull(),
    approvalId: uuid("approval_id").references(() => autonomyApprovals.id),
    status: text("status").default("preview").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    externalPostId: text("external_post_id"),
    attempts: integer("attempts").default(0).notNull(),
    error: text("error"),
    previewPayload: jsonb("preview_payload").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("publish_jobs_owner_idx").on(table.ownerId),
    channelIdx: index("publish_jobs_channel_idx").on(table.channelId),
    statusIdx: index("publish_jobs_status_idx").on(table.status),
    scheduleIdx: index("publish_jobs_schedule_idx").on(table.scheduledFor),
  })
);

export const autonomyApprovals = pgTable(
  "autonomy_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id").references(() => autonomyRuns.id, { onDelete: "cascade" }).notNull(),
    taskId: uuid("task_id").references(() => autonomyTasks.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id").references(() => users.id),
    status: text("status").default("pending").notNull(),
    reason: text("reason"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    runIdx: index("autonomy_approvals_run_idx").on(table.runId),
    statusIdx: index("autonomy_approvals_status_idx").on(table.status),
  })
);

export const autonomyMetrics = pgTable(
  "autonomy_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").references(() => users.id).notNull(),
    metric: text("metric").notNull(),
    value: decimal("value", { precision: 14, scale: 4 }).notNull(),
    source: text("source").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("autonomy_metrics_owner_idx").on(table.ownerId),
    metricIdx: index("autonomy_metrics_metric_idx").on(table.metric),
  })
);


export const socialPublishRequests = pgTable(
  "social_publish_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").references(() => users.id).notNull(),
    draftId: uuid("draft_id").references(() => contentDrafts.id, { onDelete: "cascade" }).notNull(),
    platform: text("platform").notNull(),
    status: text("status").default("pending").notNull(),
    requestedBy: uuid("requested_by").references(() => users.id).notNull(),
    approvedBy: uuid("approved_by").references(() => users.id),
    externalPostId: text("external_post_id"),
    error: text("error"),
    metadata: jsonb("metadata").default({}),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => ({
    ownerIdx: index("social_publish_requests_owner_idx").on(table.ownerId),
    draftIdx: index("social_publish_requests_draft_idx").on(table.draftId),
    statusIdx: index("social_publish_requests_status_idx").on(table.status),
  })
);
