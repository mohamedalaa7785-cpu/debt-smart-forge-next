import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* =========================
   USERS 🔐
========================= */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  email: text("email").notNull().unique(),
  password: text("password").notNull(),

  role: text("role").default("agent"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  logs: many(logs),
}));

/* =========================
   SESSIONS
========================= */
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").unique(),
  expiresAt: timestamp("expires_at"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

/* =========================
   LOGS 📊
========================= */
export const logs = pgTable("logs", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action"),
  meta: jsonb("meta"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const logsRelations = relations(logs, ({ one }) => ({
  user: one(users, {
    fields: [logs.userId],
    references: [users.id],
  }),
}));

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

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clientsRelations = relations(clients, ({ many }) => ({
  phones: many(clientPhones),
  addresses: many(clientAddresses),
  loans: many(clientLoans),
  actions: many(clientActions),
  osintResults: many(osintResults),
  images: many(clientImages),
}));

/* =========================
   PHONES
========================= */
export const clientPhones = pgTable("client_phones", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),

  phone: text("phone").notNull(),
  isPrimary: boolean("is_primary").default(false),

  createdAt: timestamp("created_at").defaultNow(),
});

export const clientPhonesRelations = relations(clientPhones, ({ one }) => ({
  client: one(clients, {
    fields: [clientPhones.clientId],
    references: [clients.id],
  }),
}));

/* =========================
   ADDRESSES
========================= */
export const clientAddresses = pgTable("client_addresses", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),

  address: text("address").notNull(),

  lat: numeric("lat"),
  lng: numeric("lng"),

  isPrimary: boolean("is_primary").default(false),

  createdAt: timestamp("created_at").defaultNow(),
});

export const clientAddressesRelations = relations(clientAddresses, ({ one }) => ({
  client: one(clients, {
    fields: [clientAddresses.clientId],
    references: [clients.id],
  }),
}));

/* =========================
   LOANS 🔥
========================= */
export const clientLoans = pgTable("client_loans", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),

  loanType: text("loan_type").notNull(),
  loanNumber: text("loan_number"),

  balance: numeric("balance").notNull(),
  emi: numeric("emi").notNull(),

  bucket: integer("bucket").default(1),

  penaltyEnabled: boolean("penalty_enabled").default(false),
  penaltyAmount: numeric("penalty_amount"),

  amountDue: numeric("amount_due"),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
});

export const clientLoansRelations = relations(clientLoans, ({ one }) => ({
  client: one(clients, {
    fields: [clientLoans.clientId],
    references: [clients.id],
  }),
}));

/* =========================
   ACTIONS
========================= */
export const clientActions = pgTable("client_actions", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),

  actionType: text("action_type").notNull(),
  note: text("note"),
  result: text("result"),
  amountPaid: numeric("amount_paid"),
  nextActionDate: timestamp("next_action_date"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const clientActionsRelations = relations(clientActions, ({ one }) => ({
  client: one(clients, {
    fields: [clientActions.clientId],
    references: [clients.id],
  }),
}));

/* =========================
   OSINT 🔍
========================= */
export const osintResults = pgTable("osint_results", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),

  socialLinks: jsonb("social_links"),
  workplace: jsonb("workplace"),

  webResults: jsonb("web_results"),
  imageResults: jsonb("image_results"),

  summary: text("summary"),
  confidenceScore: integer("confidence_score"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const osintResultsRelations = relations(osintResults, ({ one }) => ({
  client: one(clients, {
    fields: [osintResults.clientId],
    references: [clients.id],
  }),
}));

/* =========================
   IMAGES
========================= */
export const clientImages = pgTable("client_images", {
  id: uuid("id").defaultRandom().primaryKey(),

  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),

  imageUrl: text("image_url").notNull(),
  publicId: text("public_id"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const clientImagesRelations = relations(clientImages, ({ one }) => ({
  client: one(clients, {
    fields: [clientImages.clientId],
    references: [clients.id],
  }),
}));
