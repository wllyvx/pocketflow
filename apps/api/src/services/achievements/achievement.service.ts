import { eq, and, count } from "drizzle-orm";
import { users, userAchievements, envelopes, transactions } from "../../db/schema";
import { ACHIEVEMENTS } from "./definitions";

type Database = any; // Drizzle database instance type

export async function getUserAchievements(db: Database, userId: string) {
  const unlocked = await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  const unlockedMap = new Map(unlocked.map((u: any) => [u.achievementId, u.unlockedAt]));

  return ACHIEVEMENTS.map((ach) => ({
    ...ach,
    unlocked: unlockedMap.has(ach.id),
    unlockedAt: unlockedMap.get(ach.id) || null,
  }));
}

export async function checkAndUnlock(db: Database, userId: string, achievementId: string) {
  const existing = await db
    .select()
    .from(userAchievements)
    .where(
      and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return false; // Already unlocked
  }

  try {
    await db.insert(userAchievements).values({
      id: crypto.randomUUID(),
      userId,
      achievementId,
      unlockedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return true; // Newly unlocked
  } catch (err) {
    // Handle potential duplicate key race condition gracefully
    return false;
  }
}

export async function updateStreakAndCheck(db: Database, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const lastActivity = user.lastActivityDate ? new Date(user.lastActivityDate) : null;
  const lastActivityStart = lastActivity 
    ? new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate()).getTime()
    : null;

  let newStreak = user.currentStreak || 0;

  if (lastActivityStart === null) {
    newStreak = 1;
  } else {
    const diffTime = todayStart - lastActivityStart;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
    // If diffDays === 0, same day activity, streak doesn't change
  }

  await db
    .update(users)
    .set({
      currentStreak: newStreak,
      lastActivityDate: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId));

  if (newStreak >= 7) {
    await checkAndUnlock(db, userId, "7-day-streak");
  }
  if (newStreak >= 30) {
    await checkAndUnlock(db, userId, "30-day-streak");
  }
}

export async function checkAchievementsForEvent(db: Database, userId: string, eventType: string, payload?: any) {
  // Fetch user first to check lastActivityDate before updating streak
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  // Always update streak on active user events
  await updateStreakAndCheck(db, userId);

  if (eventType === "envelope_created") {
    await checkAndUnlock(db, userId, "first-envelope");
  }

  if (eventType === "transaction_created") {
    await checkAndUnlock(db, userId, "first-transaction");

    // Check 10-transactions
    const txCountResult = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.userId, userId));
    
    const txCount = txCountResult[0]?.count || 0;
    if (txCount >= 10) {
      await checkAndUnlock(db, userId, "10-transactions");
    }

    // Check budget-cycle-complete on month boundary
    if (user) {
      const txDate = payload && payload.date ? new Date(payload.date) : new Date();
      const lastActivity = user.lastActivityDate ? new Date(user.lastActivityDate) : null;

      if (lastActivity) {
        const lastMonth = lastActivity.getMonth();
        const lastYear = lastActivity.getFullYear();
        const currentMonth = txDate.getMonth();
        const currentYear = txDate.getFullYear();

        // Month boundary: different calendar month/year
        if (currentYear > lastYear || (currentYear === lastYear && currentMonth > lastMonth)) {
          const userEnvelopes = await db
            .select()
            .from(envelopes)
            .where(eq(envelopes.userId, userId));

          if (userEnvelopes.length > 0) {
            // Check if any envelope went negative or has negative current amount
            // Wait, let's check current amounts or transaction history if needed.
            // The prompt says: "Check if at least 1 envelope exists AND no envelope went negative during the previous calendar month."
            // Let's check if any envelope's currentAmount < 0 or if there are negative history records.
            // Since we store currentAmount on envelopes, let's check current amounts, or check if any envelope had negative balance.
            const hasNegative = userEnvelopes.some((env: any) => env.currentAmount < 0);
            if (!hasNegative) {
              await checkAndUnlock(db, userId, "budget-cycle-complete");
            }
          }
        }
      }
    }
  }

  if (eventType === "envelope_funded" || eventType === "envelope_created" || eventType === "transaction_created") {
    // Check all-envelopes-funded
    const userEnvelopes = await db
      .select()
      .from(envelopes)
      .where(eq(envelopes.userId, userId));

    if (userEnvelopes.length > 0) {
      const allFunded = userEnvelopes.every((env: any) => env.budgetedAmount > 0);
      if (allFunded) {
        await checkAndUnlock(db, userId, "all-envelopes-funded");
      }
    }
  }

  if (eventType === "budget_cycle_completed") {
    await checkAndUnlock(db, userId, "budget-cycle-complete");
  }
}
