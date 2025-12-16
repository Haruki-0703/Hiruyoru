import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, mealRecords, InsertMealRecord, MealRecord } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Meal record queries

export async function createMealRecord(data: InsertMealRecord): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(mealRecords).values(data);
  return Number(result[0].insertId);
}

export async function getMealsByDate(userId: number, date: string): Promise<MealRecord[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(mealRecords)
    .where(and(eq(mealRecords.userId, userId), eq(mealRecords.date, date)));
}

export async function getMealsByDateRange(
  userId: number,
  startDate: string,
  endDate: string
): Promise<MealRecord[]> {
  const db = await getDb();
  if (!db) return [];

  const { gte, lte } = await import("drizzle-orm");
  return db
    .select()
    .from(mealRecords)
    .where(
      and(
        eq(mealRecords.userId, userId),
        gte(mealRecords.date, startDate),
        lte(mealRecords.date, endDate)
      )
    )
    .orderBy(desc(mealRecords.date));
}

export async function getRecentMeals(userId: number, limit: number = 10): Promise<MealRecord[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(mealRecords)
    .where(eq(mealRecords.userId, userId))
    .orderBy(desc(mealRecords.date), desc(mealRecords.createdAt))
    .limit(limit);
}

export async function getTodayLunch(userId: number, date: string): Promise<MealRecord | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(mealRecords)
    .where(
      and(
        eq(mealRecords.userId, userId),
        eq(mealRecords.date, date),
        eq(mealRecords.mealType, "lunch")
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function deleteMealRecord(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(mealRecords).where(and(eq(mealRecords.id, id), eq(mealRecords.userId, userId)));
}
