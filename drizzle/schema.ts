import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  // Notification settings
  notificationEnabled: boolean("notificationEnabled").default(true),
  lunchReminderTime: varchar("lunchReminderTime", { length: 5 }).default("12:00"), // HH:MM format
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Meal records table - stores lunch and dinner records
 */
export const mealRecords = mysqlTable("meal_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  groupId: int("groupId"), // Optional group association
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  mealType: mysqlEnum("mealType", ["lunch", "dinner"]).notNull(),
  dishName: varchar("dishName", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["japanese", "western", "chinese", "other"]).notNull(),
  note: text("note"),
  imageUrl: text("imageUrl"),
  isFavorite: boolean("isFavorite").default(false), // v0.6: お気に入りフラグ
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MealRecord = typeof mealRecords.$inferSelect;
export type InsertMealRecord = typeof mealRecords.$inferInsert;

/**
 * Groups table - family/group management
 */
export const groups = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  inviteCode: varchar("inviteCode", { length: 8 }).notNull().unique(),
  ownerId: int("ownerId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;

/**
 * Group members table - relationship between users and groups
 */
export const groupMembers = mysqlTable("group_members", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = typeof groupMembers.$inferInsert;

/**
 * Favorite meals table - v0.6: お気に入りメニュー機能
 */
export const favoriteMeals = mysqlTable("favorite_meals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  dishName: varchar("dishName", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["japanese", "western", "chinese", "other"]).notNull(),
  note: text("note"),
  imageUrl: text("imageUrl"),
  usageCount: int("usageCount").default(0), // 使用回数
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FavoriteMeal = typeof favoriteMeals.$inferSelect;
export type InsertFavoriteMeal = typeof favoriteMeals.$inferInsert;

/**
 * Pantry inventory table - v0.6: 食材在庫管理機能
 */
export const pantryInventory = mysqlTable("pantry_inventory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  groupId: int("groupId"), // Optional group association
  ingredientName: varchar("ingredientName", { length: 255 }).notNull(),
  quantity: varchar("quantity", { length: 50 }), // "2個", "500g" など
  unit: varchar("unit", { length: 20 }), // "個", "g", "ml" など
  category: mysqlEnum("category", ["vegetable", "meat", "fish", "seasoning", "other"]).notNull(),
  expiryDate: varchar("expiryDate", { length: 10 }), // YYYY-MM-DD format
  lowStockAlert: boolean("lowStockAlert").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PantryInventory = typeof pantryInventory.$inferSelect;
export type InsertPantryInventory = typeof pantryInventory.$inferInsert;
