import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, mealRecords, InsertMealRecord, MealRecord, groups, groupMembers, InsertGroup, InsertGroupMember, Group, GroupMember } from "../drizzle/schema";
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

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserNotificationSettings(userId: number, enabled: boolean, reminderTime: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({
    notificationEnabled: enabled,
    lunchReminderTime: reminderTime,
  }).where(eq(users.id, userId));
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

// Group queries

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createGroup(name: string, description: string | null, ownerId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const inviteCode = generateInviteCode();
  
  const result = await db.insert(groups).values({
    name,
    description,
    inviteCode,
    ownerId,
  });
  
  const groupId = Number(result[0].insertId);
  
  // Add owner as a member
  await db.insert(groupMembers).values({
    groupId,
    userId: ownerId,
    role: "owner",
  });
  
  return groupId;
}

export async function getGroupById(id: number): Promise<Group | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getGroupByInviteCode(inviteCode: string): Promise<Group | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(groups).where(eq(groups.inviteCode, inviteCode)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getUserGroups(userId: number): Promise<(Group & { memberRole: string })[]> {
  const db = await getDb();
  if (!db) return [];

  const memberships = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  if (memberships.length === 0) return [];

  const groupIds = memberships.map(m => m.groupId);
  const groupsResult = await db
    .select()
    .from(groups)
    .where(inArray(groups.id, groupIds));

  return groupsResult.map(group => ({
    ...group,
    memberRole: memberships.find(m => m.groupId === group.id)?.role || "member",
  }));
}

export async function getGroupMembers(groupId: number): Promise<{ member: GroupMember; user: { id: number; name: string | null; email: string | null } }[]> {
  const db = await getDb();
  if (!db) return [];

  const members = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  const userIds = members.map(m => m.userId);
  if (userIds.length === 0) return [];

  const usersResult = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, userIds));

  return members.map(member => ({
    member,
    user: usersResult.find(u => u.id === member.userId) || { id: member.userId, name: null, email: null },
  }));
}

export async function joinGroup(groupId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already a member
  const existing = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Already a member of this group");
  }

  await db.insert(groupMembers).values({
    groupId,
    userId,
    role: "member",
  });
}

export async function leaveGroup(groupId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(groupMembers).where(
    and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))
  );
}

export async function deleteGroup(groupId: number, ownerId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify ownership
  const group = await getGroupById(groupId);
  if (!group || group.ownerId !== ownerId) {
    throw new Error("Not authorized to delete this group");
  }

  // Delete all members first
  await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId));
  
  // Delete the group
  await db.delete(groups).where(eq(groups.id, groupId));
}

export async function getGroupMealsForDate(groupId: number, date: string): Promise<(MealRecord & { userName: string | null })[]> {
  const db = await getDb();
  if (!db) return [];

  // Get all members of the group
  const members = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  const userIds = members.map(m => m.userId);
  if (userIds.length === 0) return [];

  // Get meals for all members
  const meals = await db
    .select()
    .from(mealRecords)
    .where(and(inArray(mealRecords.userId, userIds), eq(mealRecords.date, date)));

  // Get user names
  const usersResult = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, userIds));

  return meals.map(meal => ({
    ...meal,
    userName: usersResult.find(u => u.id === meal.userId)?.name || null,
  }));
}
