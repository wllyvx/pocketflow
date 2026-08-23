import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  auth0Id: text("auth0_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  onboardingStatus: text("onboarding_status").notNull().default("pending"),
  currentStreak: integer("current_streak").notNull().default(0),
  lastActivityDate: integer("last_activity_date", { mode: "timestamp_ms" }),
  ...timestamps,
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  plaidAccountId: text("plaid_account_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  subtype: text("subtype").notNull(),
  balance: real("balance").notNull(),
  currency: text("currency").notNull(),
  accessToken: text("access_token").notNull(),
  itemId: text("item_id").notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("accounts_user_plaid_id").on(table.userId, table.plaidAccountId)]);

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull().unique(),
  type: text("type").notNull(),
  icon: text("icon"),
  ...timestamps,
}, (table) => [uniqueIndex("categories_user_name").on(table.userId, table.name)]);

export const envelopes = sqliteTable("envelopes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  categoryId: text("category_id").notNull().references(() => categories.id),
  name: text("name").notNull(),
  budgetedAmount: real("budgeted_amount").notNull(),
  currentAmount: real("current_amount").notNull(),
  resetFrequency: text("reset_frequency").notNull(),
  lastResetDate: integer("last_reset_date", { mode: "timestamp_ms" }).notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("envelopes_user_name").on(table.userId, table.name)]);

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  accountId: text("account_id").references(() => accounts.id),
  envelopeId: text("envelope_id").references(() => envelopes.id),
  destinationEnvelopeId: text("destination_envelope_id").references(() => envelopes.id),
  categoryId: text("category_id").references(() => categories.id),
  plaidTransactionId: text("plaid_transaction_id").unique(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  type: text("type").notNull(),
  date: integer("date", { mode: "timestamp_ms" }).notNull(),
  isManual: integer("is_manual", { mode: "boolean" }).notNull(),
  receiptUrl: text("receipt_url"),
  ...timestamps,
});

export const userAchievements = sqliteTable("user_achievements", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  achievementId: text("achievement_id").notNull(),
  unlockedAt: integer("unlocked_at", { mode: "timestamp_ms" }).notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("user_achievements_user_achievement_id").on(table.userId, table.achievementId)]);
