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

export const users = pgTable("users", {
  id: uuid("id").primaryKey().notNull(),

  email: text("email").notNull().unique(),
  name: text("name"),

  role: roleEnum("role").default("collector").notNull(),

  isSuperUser: boolean("is_super_user").default(false),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
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

    social: jsonb("social").default([]),
    workplace: jsonb("workplace").default([]),
    webResults: jsonb("web_results").default([]),
    imageResults: jsonb("image_results").default([]),
    mapsResults: jsonb("maps_results").default([]),

    summary: text("summary"),

    confidenceScore: integer("confidence_score").default(0),

    riskLevel: text("risk_level").default("low"),
    fraudFlags: jsonb("fraud_flags").default([]),

    lastAnalyzedAt: timestamp("last_analyzed_at", {
      withTimezone: true,
    }).defaultNow(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => ({
    clientIdx: index("osint_client_idx").on(table.clientId),
  })
);

/* =========================
   OSINT HISTORY 🔥
========================= */

export const osintHistory = pgTable(
  "osint_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),

    result: jsonb("result").default({}),

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

    signals: jsonb("signals").default([]),

    aiSummary: text("ai_summary"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => ({
    clientIdx: index("fraud_client_idx").on(table.clientId),
  })
);
