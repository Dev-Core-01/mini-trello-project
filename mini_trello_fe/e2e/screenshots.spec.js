import { expect, test } from "@playwright/test";

// Run against a stack seeded with `python manage.py seed_board --reset`.
const OUT = "../docs/screenshots";

const openBoard = async (page) => {
  await page.goto("/");
  await expect(page.getByText("Order new name badges")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
};

test.describe("README screenshots", () => {
  test("board", async ({ page }) => {
    await openBoard(page);
    await page.screenshot({ path: `${OUT}/board.png` });
  });

  test("board on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openBoard(page);
    await page.screenshot({ path: `${OUT}/board-mobile.png` });
  });

  test("card form", async ({ page }) => {
    await openBoard(page);
    await page.getByRole("button", { name: "Edit Redesign the sign-up form" }).click();
    await expect(page.getByLabel("Title")).toHaveValue("Redesign the sign-up form");
    await page.screenshot({ path: `${OUT}/edit-card.png` });
  });

  test("validation error", async ({ page }) => {
    await openBoard(page);
    await page.getByRole("button", { name: "Add card", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Add card" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page.screenshot({ path: `${OUT}/validation.png` });
  });
});
