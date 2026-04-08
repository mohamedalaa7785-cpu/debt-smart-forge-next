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
   USERS (SYNC WITH SUPABASE)
========================= */

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .notNull(), // must match auth.users.id

  email: text("email").notNull().unique(),
  name: text("name"),

  role: roleEnum("role").default("collector").notNull(),

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

    createdBy: uuid("created_by").references(() => users.id), // 🔥 FIX

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

    lat: decimal("lat", { precision: 10, scale: 6 }), // 🔥 FIX
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
   (باقي الجداول زي ما هي - سليمة)
========================= */
