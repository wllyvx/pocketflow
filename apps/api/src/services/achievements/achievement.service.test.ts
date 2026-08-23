import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../../db/schema";
import { checkAndUnlock, checkAchievementsForEvent, getUserAchievements } from "./achievement.service";
import { eq } from "drizzle-orm";

describe("Achievement Service", () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle>;
  const userId = "test-user-id";

  beforeEach(() => {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite, { schema });

    // Create tables manually for testing
    sqlite.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY NOT NULL,
        auth0_id TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        onboarding_status TEXT NOT NULL DEFAULT 'pending',
        current_streak INTEGER NOT NULL DEFAULT 0,
        last_activity_date INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE categories (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT REFERENCES users(id),
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        icon TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE envelopes (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id),
        category_id TEXT NOT NULL REFERENCES categories(id),
        name TEXT NOT NULL,
        budgeted_amount REAL NOT NULL,
        current_amount REAL NOT NULL,
        reset_frequency TEXT NOT NULL,
        last_reset_date INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE transactions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id),
        account_id TEXT,
        envelope_id TEXT REFERENCES envelopes(id),
        destination_envelope_id TEXT REFERENCES envelopes(id),
        category_id TEXT REFERENCES categories(id),
        plaid_transaction_id TEXT UNIQUE,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        date INTEGER NOT NULL,
        isManual INTEGER NOT NULL,
        receipt_url TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE user_achievements (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id),
        achievement_id TEXT NOT NULL,
        unlocked_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Insert test user
    sqlite.prepare(
      "INSERT INTO users (id, auth0_id, email, name, current_streak, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(userId, "auth0|123", "test@example.com", "Test User", 0, Date.now(), Date.now());
  });

  it("should list all achievements with locked status initially", async () => {
    const achievements = await getUserAchievements(db, userId);
    expect(achievements.length).toBe(7);
    expect(achievements.every((a: any) => !a.unlocked)).toBe(true);
  });

  it("should unlock achievement idempotently", async () => {
    const firstUnlock = await checkAndUnlock(db, userId, "first-envelope");
    expect(firstUnlock).toBe(true);

    const secondUnlock = await checkAndUnlock(db, userId, "first-envelope");
    expect(secondUnlock).toBe(false);

    const achievements = await getUserAchievements(db, userId);
    const firstEnvAch = achievements.find((a: any) => a.id === "first-envelope");
    expect(firstEnvAch?.unlocked).toBe(true);
  });

  it("should unlock first-envelope achievement on envelope_created event", async () => {
    // Insert category first
    sqlite.prepare(
      "INSERT INTO categories (id, user_id, name, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("cat-1", userId, "Food", "expense", Date.now(), Date.now());

    sqlite.prepare(
      "INSERT INTO envelopes (id, user_id, category_id, name, budgeted_amount, current_amount, reset_frequency, last_reset_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run("env-1", userId, "cat-1", "Groceries", 100, 100, "monthly", Date.now(), Date.now(), Date.now());

    await checkAchievementsForEvent(db, userId, "envelope_created");

    const achievements = await getUserAchievements(db, userId);
    expect(achievements.find((a: any) => a.id === "first-envelope")?.unlocked).toBe(true);
  });

  it("should handle streak increment and reset correctly", async () => {
    // Simulate activity today
    await checkAchievementsForEvent(db, userId, "transaction_created");
    let user = sqlite.prepare("SELECT current_streak FROM users WHERE id = ?").get(userId) as any;
    expect(user.current_streak).toBe(1);

    // Simulate activity yesterday to increment streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    sqlite.prepare("UPDATE users SET last_activity_date = ?, current_streak = 1 WHERE id = ?").run(yesterday.getTime(), userId);

    await checkAchievementsForEvent(db, userId, "transaction_created");
    user = sqlite.prepare("SELECT current_streak FROM users WHERE id = ?").get(userId) as any;
    expect(user.current_streak).toBe(2);

    // Simulate activity 3 days ago (gap > 1 day) -> streak resets to 1
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    sqlite.prepare("UPDATE users SET last_activity_date = ?, current_streak = 5 WHERE id = ?").run(threeDaysAgo.getTime(), userId);

    await checkAchievementsForEvent(db, userId, "transaction_created");
    user = sqlite.prepare("SELECT current_streak FROM users WHERE id = ?").get(userId) as any;
    expect(user.current_streak).toBe(1);
  });
});
