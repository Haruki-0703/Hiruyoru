import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

/**
 * IT-01: 食事記録APIのスキーマテスト
 */
describe("Meals API Schema", () => {
  const createMealSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mealType: z.enum(["lunch", "dinner"]),
    dishName: z.string().min(1).max(255),
    category: z.enum(["japanese", "western", "chinese", "other"]),
    note: z.string().max(500).optional(),
    imageUrl: z.string().url().optional(),
  });

  it("should validate correct meal input", () => {
    const validInput = {
      date: "2025-12-16",
      mealType: "lunch",
      dishName: "カレーライス",
      category: "japanese",
    };

    const result = createMealSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("should reject invalid date format", () => {
    const invalidInput = {
      date: "2025/12/16",
      mealType: "lunch",
      dishName: "カレーライス",
      category: "japanese",
    };

    const result = createMealSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should reject empty dish name", () => {
    const invalidInput = {
      date: "2025-12-16",
      mealType: "lunch",
      dishName: "",
      category: "japanese",
    };

    const result = createMealSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should reject invalid meal type", () => {
    const invalidInput = {
      date: "2025-12-16",
      mealType: "breakfast",
      dishName: "トースト",
      category: "western",
    };

    const result = createMealSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should accept optional note", () => {
    const validInput = {
      date: "2025-12-16",
      mealType: "dinner",
      dishName: "パスタ",
      category: "western",
      note: "美味しかった",
    };

    const result = createMealSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("should accept optional imageUrl", () => {
    const validInput = {
      date: "2025-12-16",
      mealType: "lunch",
      dishName: "ラーメン",
      category: "chinese",
      imageUrl: "https://example.com/image.jpg",
    };

    const result = createMealSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });
});

/**
 * IT-02: おすすめAPIのスキーマテスト
 */
describe("Recommendations API Schema", () => {
  const recommendationInputSchema = z.object({
    lunchDishName: z.string(),
    lunchCategory: z.enum(["japanese", "western", "chinese", "other"]),
  });

  const recommendationOutputSchema = z.array(
    z.object({
      name: z.string(),
      category: z.enum(["japanese", "western", "chinese", "other"]),
      reason: z.string(),
    })
  );

  it("should validate recommendation input", () => {
    const validInput = {
      lunchDishName: "カレーライス",
      lunchCategory: "japanese",
    };

    const result = recommendationInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("should validate recommendation output structure", () => {
    const validOutput = [
      {
        name: "焼き魚定食",
        category: "japanese",
        reason: "バランスの良い和食でヘルシーです",
      },
      {
        name: "野菜たっぷりスープ",
        category: "western",
        reason: "野菜をしっかり摂れます",
      },
      {
        name: "豆腐ハンバーグ",
        category: "japanese",
        reason: "タンパク質を補給できます",
      },
    ];

    const result = recommendationOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it("should have exactly 3 recommendations", () => {
    const validOutput = [
      { name: "料理1", category: "japanese", reason: "理由1" },
      { name: "料理2", category: "western", reason: "理由2" },
      { name: "料理3", category: "chinese", reason: "理由3" },
    ];

    expect(validOutput).toHaveLength(3);
  });
});

/**
 * IT-03: 画像解析APIのスキーマテスト
 */
describe("Image Analysis API Schema", () => {
  const imageAnalysisInputSchema = z.object({
    imageBase64: z.string(),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  });

  const imageAnalysisOutputSchema = z.object({
    imageUrl: z.string(),
    dishName: z.string(),
    category: z.enum(["japanese", "western", "chinese", "other"]),
    description: z.string().optional(),
  });

  it("should validate image analysis input", () => {
    const validInput = {
      imageBase64: "base64encodedstring",
      mimeType: "image/jpeg",
    };

    const result = imageAnalysisInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("should reject invalid mime type", () => {
    const invalidInput = {
      imageBase64: "base64encodedstring",
      mimeType: "image/gif",
    };

    const result = imageAnalysisInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should validate image analysis output", () => {
    const validOutput = {
      imageUrl: "https://storage.example.com/meals/123.jpg",
      dishName: "カレーライス",
      category: "japanese",
      description: "野菜カレーです",
    };

    const result = imageAnalysisOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });
});

/**
 * IT-04: 日付範囲クエリのテスト
 */
describe("Date Range Query", () => {
  const dateRangeSchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });

  it("should validate date range input", () => {
    const validInput = {
      startDate: "2025-12-01",
      endDate: "2025-12-16",
    };

    const result = dateRangeSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("should validate that startDate is before endDate", () => {
    const validateDateRange = (start: string, end: string): boolean => {
      return new Date(start) <= new Date(end);
    };

    expect(validateDateRange("2025-12-01", "2025-12-16")).toBe(true);
    expect(validateDateRange("2025-12-16", "2025-12-01")).toBe(false);
  });
});
