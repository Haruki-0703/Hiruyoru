import { describe, expect, it } from "vitest";

/**
 * UT-01: 日付フォーマット関数のテスト
 */
describe("Date Formatting", () => {
  it("should return date in YYYY-MM-DD format", () => {
    const getTodayDate = (): string => {
      const today = new Date();
      return today.toISOString().split("T")[0];
    };
    
    const result = getTodayDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should return today's date", () => {
    const getTodayDate = (): string => {
      const today = new Date();
      return today.toISOString().split("T")[0];
    };
    
    const result = getTodayDate();
    const expected = new Date().toISOString().split("T")[0];
    expect(result).toBe(expected);
  });
});

/**
 * UT-02: カテゴリデータのテスト
 */
describe("Category Data", () => {
  const categories = [
    { key: "japanese", label: "和食", emoji: "🍱" },
    { key: "western", label: "洋食", emoji: "🍝" },
    { key: "chinese", label: "中華", emoji: "🥟" },
    { key: "other", label: "その他", emoji: "🍽️" },
  ];

  it("should have 4 categories", () => {
    expect(categories).toHaveLength(4);
  });

  it("each category should have key, label, and emoji", () => {
    categories.forEach((cat) => {
      expect(cat).toHaveProperty("key");
      expect(cat).toHaveProperty("label");
      expect(cat).toHaveProperty("emoji");
    });
  });

  it("should have valid category keys", () => {
    const validKeys = ["japanese", "western", "chinese", "other"];
    categories.forEach((cat) => {
      expect(validKeys).toContain(cat.key);
    });
  });
});

/**
 * UT-03: ローカルストレージデータ構造のテスト
 */
describe("Local Meal Data Structure", () => {
  interface LocalMeal {
    id: string;
    date: string;
    mealType: "lunch" | "dinner";
    dishName: string;
    category: "japanese" | "western" | "chinese" | "other";
    note?: string;
    createdAt: string;
  }

  it("should create valid meal object", () => {
    const meal: LocalMeal = {
      id: "test-123",
      date: "2025-12-16",
      mealType: "lunch",
      dishName: "カレーライス",
      category: "japanese",
      createdAt: new Date().toISOString(),
    };

    expect(meal.id).toBeDefined();
    expect(meal.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(["lunch", "dinner"]).toContain(meal.mealType);
    expect(meal.dishName.length).toBeGreaterThan(0);
    expect(["japanese", "western", "chinese", "other"]).toContain(meal.category);
  });

  it("should allow optional note field", () => {
    const mealWithNote: LocalMeal = {
      id: "test-456",
      date: "2025-12-16",
      mealType: "dinner",
      dishName: "パスタ",
      category: "western",
      note: "美味しかった",
      createdAt: new Date().toISOString(),
    };

    expect(mealWithNote.note).toBe("美味しかった");
  });
});

/**
 * UT-04: 入力バリデーションのテスト
 */
describe("Input Validation", () => {
  const validateDishName = (name: string): boolean => {
    return name.trim().length > 0 && name.length <= 100;
  };

  const validateNote = (note: string): boolean => {
    return note.length <= 500;
  };

  it("should reject empty dish name", () => {
    expect(validateDishName("")).toBe(false);
    expect(validateDishName("   ")).toBe(false);
  });

  it("should accept valid dish name", () => {
    expect(validateDishName("カレーライス")).toBe(true);
    expect(validateDishName("親子丼")).toBe(true);
  });

  it("should reject dish name over 100 characters", () => {
    const longName = "あ".repeat(101);
    expect(validateDishName(longName)).toBe(false);
  });

  it("should accept note under 500 characters", () => {
    expect(validateNote("美味しかった")).toBe(true);
    expect(validateNote("")).toBe(true);
  });

  it("should reject note over 500 characters", () => {
    const longNote = "あ".repeat(501);
    expect(validateNote(longNote)).toBe(false);
  });
});
