import { device, element, by, expect, waitFor } from "detox";

describe("Guest User Flow", () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it("should display home screen without login", async () => {
    await expect(element(by.text("こんにちは"))).toBeVisible();
  });

  it("should allow recording lunch as guest", async () => {
    // Navigate to record tab
    await element(by.id("record-tab")).multiTap(1);
    
    // Wait for record screen to appear
    await waitFor(element(by.text("ランチを記録する")))
      .toBeVisible()
      .withTimeout(5000);

    // Enter dish name
    await element(by.id("dish-name-input")).typeText("カレーライス");

    // Select category
    await element(by.id("category-japanese")).multiTap(1);

    // Submit
    await element(by.id("submit-button")).multiTap(1);

    // Verify success message
    await expect(element(by.text("記録しました"))).toBeVisible();
  });

  it("should display recorded meal in history", async () => {
    // Navigate to history tab
    await element(by.id("history-tab")).multiTap(1);

    // Verify the recorded meal appears
    await expect(element(by.text("カレーライス"))).toBeVisible();
  });

  it("should show login prompt on recommendations tab", async () => {
    // Navigate to recommendations tab
    await element(by.id("recommend-tab")).multiTap(1);

    // Verify login prompt is shown
    await expect(element(by.text("ログインするとAIおすすめ機能が使えます"))).toBeVisible();
  });
});
