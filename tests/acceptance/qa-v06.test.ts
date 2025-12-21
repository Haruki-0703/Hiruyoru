import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "../../server/routers";
import type { TrpcContext } from "../../server/_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    notificationEnabled: true,
    lunchReminderTime: "12:00",
  };

  return {
    user,
    req: {
      protocol: "https",
      hostname: "localhost",
      headers: {
        host: "localhost:3000",
        "x-forwarded-proto": "https",
      },
      get: (name: string) => {
        if (name === "host") return "localhost:3000";
        return undefined;
      },
    } as unknown as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("QA Test Suite - v0.6 Features", () => {
  describe("Favorite Meals Feature", () => {
    it("should create a favorite meal", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.favorites.create({
        dishName: "カレーライス",
        category: "japanese",
        note: "よく食べる定番メニュー",
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
    });

    it("should list favorite meals", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const favorites = await caller.favorites.list();

      expect(Array.isArray(favorites)).toBe(true);
    });

    it("should handle empty dish name", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.favorites.create({
          dishName: "",
          category: "japanese",
        })
      ).rejects.toThrow();
    });

    it("should handle invalid category", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.favorites.create({
          dishName: "テストメニュー",
          category: "invalid" as any,
        })
      ).rejects.toThrow();
    });
  });

  describe("Pantry Inventory Feature", () => {
    it("should create a pantry item", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.pantry.create({
        ingredientName: "玉ねぎ",
        quantity: "3個",
        unit: "個",
        category: "vegetable",
        expiryDate: "2025-01-31",
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
    });

    it("should list pantry items", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const items = await caller.pantry.list({});

      expect(Array.isArray(items)).toBe(true);
    });

    it("should update pantry item quantity", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create item first
      const created = await caller.pantry.create({
        ingredientName: "にんじん",
        quantity: "5本",
        unit: "本",
        category: "vegetable",
      });

      // Update quantity
      const result = await caller.pantry.update({
        id: created.id,
        quantity: "3本",
      });

      expect(result.success).toBe(true);
    });

    it("should handle invalid expiry date format", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.pantry.create({
          ingredientName: "じゃがいも",
          category: "vegetable",
          expiryDate: "2025/01/31", // Invalid format
        })
      ).rejects.toThrow();
    });
  });

  describe("Guest Data Migration Feature", () => {
    it("should migrate guest data to cloud", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.migration.migrateGuestData({
        meals: [
          {
            date: "2025-01-01",
            mealType: "lunch",
            dishName: "ハンバーグ",
            category: "western",
          },
          {
            date: "2025-01-02",
            mealType: "lunch",
            dishName: "ラーメン",
            category: "chinese",
          },
        ],
      });

      expect(result).toHaveProperty("migratedCount");
      expect(typeof result.migratedCount).toBe("number");
    });

    it("should skip duplicate meals during migration", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a meal first
      await caller.meals.create({
        date: "2025-01-10",
        mealType: "lunch",
        dishName: "カレーライス",
        category: "japanese",
      });

      // Try to migrate the same meal
      const result = await caller.migration.migrateGuestData({
        meals: [
          {
            date: "2025-01-10",
            mealType: "lunch",
            dishName: "カレーライス（ゲスト）",
            category: "japanese",
          },
        ],
      });

      // Should skip the duplicate
      expect(result.migratedCount).toBe(0);
    });

    it("should handle empty migration data", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.migration.migrateGuestData({
        meals: [],
      });

      expect(result.migratedCount).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long dish names", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const longName = "あ".repeat(300);

      await expect(
        caller.favorites.create({
          dishName: longName,
          category: "japanese",
        })
      ).rejects.toThrow();
    });

    it("should handle special characters in ingredient names", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.pantry.create({
        ingredientName: "トマト（完熟）",
        category: "vegetable",
      });

      expect(result).toHaveProperty("id");
    });

    it("should handle concurrent favorite creations", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const promises = Array.from({ length: 5 }, (_, i) =>
        caller.favorites.create({
          dishName: `メニュー${i + 1}`,
          category: "japanese",
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toHaveProperty("id");
      });
    });
  });

  describe("Regression Tests", () => {
    it("should not affect existing meal creation", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.meals.create({
        date: "2025-01-15",
        mealType: "lunch",
        dishName: "親子丼",
        category: "japanese",
      });

      expect(result).toHaveProperty("id");
    });

    it("should not affect existing group functionality", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.groups.create({
        name: "テストグループ",
        description: "v0.6回帰テスト用",
      });

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("inviteCode");
    });
  });
});
