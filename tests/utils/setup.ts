/**
 * Vitest Setup File
 * テスト実行前のグローバルセットアップ
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { ReportHelpers, PerformanceHelpers } from './test-helpers';

// グローバルテスト設定
beforeAll(() => {
  console.log('🚀 Starting test suite...');

  // 環境変数の設定
  process.env.NODE_ENV = 'test';
  process.env.TZ = 'Asia/Tokyo';

  // コンソール出力の設定
  if (process.env.CI) {
    console.log('Running in CI environment');
  }
});

afterAll(() => {
  console.log('✅ Test suite completed');
});

// 各テストスイートの前後処理
beforeEach((context) => {
  PerformanceHelpers.startTimer();

  // テスト開始ログ
  console.log(`\n📋 Running: ${context.task.name}`);
});

afterEach((context) => {
  const duration = PerformanceHelpers.endTimer();

  // パフォーマンスチェック（遅いテストを検知）
  if (duration > 1000) {
    console.warn(`⚠️  Slow test detected: ${context.task.name} (${duration}ms)`);
  }

  // テスト結果ログ
  const status = context.task.result?.state === 'pass' ? 'PASS' : 'FAIL';
  ReportHelpers.logTestCase(context.task.name, status, {
    duration: `${duration}ms`,
    file: context.task.file?.name,
  });
});

// グローバルモックの設定
global.console = {
  ...console,
  // テスト中のコンソール出力を抑制（必要に応じて有効化）
  // log: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};

// 未処理のPromiseを検知
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // テスト失敗として扱う
  throw new Error(`Unhandled Promise Rejection: ${reason}`);
});

// メモリリーク検知（簡易版）
const initialMemory = process.memoryUsage();
afterAll(() => {
  const finalMemory = process.memoryUsage();
  const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

  if (memoryIncrease > 50 * 1024 * 1024) { // 50MB以上増加
    console.warn(`⚠️  Potential memory leak detected: ${Math.round(memoryIncrease / 1024 / 1024)}MB increase`);
  }
});