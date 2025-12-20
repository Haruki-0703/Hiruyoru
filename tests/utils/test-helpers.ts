/**
 * Test Utilities and Helpers
 * QAエンジニア向けのテスト支援ユーティリティ
 */

import { vi } from 'vitest';

// テストデータ生成ヘルパー
export class TestDataFactory {
  static createMealData(overrides = {}) {
    return {
      date: '2025-12-20',
      mealType: 'lunch' as const,
      dishName: 'テスト料理',
      category: 'japanese' as const,
      note: 'テスト用の食事データ',
      imageUrl: undefined,
      ...overrides,
    };
  }

  static createUserData(overrides = {}) {
    return {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'テストユーザー',
      ...overrides,
    };
  }

  static createRecommendationData(overrides = {}) {
    return {
      name: 'テストおすすめ料理',
      category: 'japanese' as const,
      reason: '栄養バランスが良いため',
      ...overrides,
    };
  }
}

// APIレスポンスモックヘルパー
export class MockHelpers {
  static mockTRPCResponse<T>(data: T) {
    return {
      data,
      isLoading: false,
      isError: false,
      error: null,
    };
  }

  static mockTRPCMutation() {
    return {
      mutateAsync: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
    };
  }
}

// アサーション拡張ヘルパー
export class AssertionHelpers {
  static expectValidMealData(meal: any) {
    expect(meal).toHaveProperty('id');
    expect(meal).toHaveProperty('date');
    expect(meal).toHaveProperty('mealType');
    expect(meal).toHaveProperty('dishName');
    expect(meal).toHaveProperty('category');
    expect(meal.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(['lunch', 'dinner']).toContain(meal.mealType);
    expect(['japanese', 'western', 'chinese', 'other']).toContain(meal.category);
  }

  static expectValidUserData(user: any) {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  }

  static expectValidIngredientData(ingredient: any) {
    expect(ingredient).toHaveProperty('name');
    expect(ingredient).toHaveProperty('amount');
    expect(ingredient).toHaveProperty('category');
    expect(typeof ingredient.name).toBe('string');
    expect(typeof ingredient.amount).toBe('string');
    expect(['野菜', '肉', '魚', '乳製品', 'その他']).toContain(ingredient.category);
  }
}

// テスト実行時間計測ヘルパー
export class PerformanceHelpers {
  private static startTime: number;

  static startTimer() {
    this.startTime = Date.now();
  }

  static endTimer(): number {
    return Date.now() - this.startTime;
  }

  static expectPerformanceUnderLimit(limitMs: number, actualMs: number) {
    expect(actualMs).toBeLessThan(limitMs);
  }
}

// テストレポート生成ヘルパー
export class ReportHelpers {
  static generateTestSummary(results: any) {
    const summary = {
      totalTests: results.numTotalTests || 0,
      passedTests: results.numPassedTests || 0,
      failedTests: results.numFailedTests || 0,
      duration: results.duration || 0,
      coverage: results.coverage || null,
    };

    console.table(summary);
    return summary;
  }

  static logTestCase(testName: string, status: 'PASS' | 'FAIL', details?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      testName,
      status,
      details: details || 'N/A',
    };

    console.log(`[${status}] ${testName}`, details ? JSON.stringify(details, null, 2) : '');
    return logEntry;
  }
}

// 環境チェックヘルパー
export class EnvironmentHelpers {
  static isCI(): boolean {
    return process.env.CI === 'true';
  }

  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  static skipOnCI() {
    if (this.isCI()) {
      return it.skip;
    }
    return it;
  }

  static onlyOnCI() {
    if (this.isCI()) {
      return it.only;
    }
    return it;
  }
}