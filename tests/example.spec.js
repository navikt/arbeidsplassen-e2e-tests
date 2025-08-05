import { test, expect } from "@playwright/test";

test.setTimeout(10000); // 10 seconds timeout

test("Verify Google loads", async ({ page }) => {
  await page.goto("https://google.com/");

  await expect(page).toHaveTitle("Google");
});

test("Test jsonplaceholder", async ({ page }) => {
  // try {
  //   const response = await fetch("https://jsonplaceholder.typicode.com/todos/1");
  //   if (!response.ok) {
  //     throw new Error(`Response status: ${response.status}`);
  //   }
  //
  //   const result = await response.json();
  //   console.log(result);
  // } catch (error) {
  //   console.error(error.message);
  // }

    await page.goto("https://jsonplaceholder.typicode.com/todos/1/");

});
//
//
// test("Verify Arbeidsplassen PROD homepage loads", async ({ page }) => {
//   await page.goto("https://arbeidsplassen.nav.no/");
//
//   await expect(page).toHaveTitle(
//     "Arbeidsplassen.no - Alle ledige jobber, samlet på én plass"
//   );
//
//   await page.screenshot({ path: "screenshots/homepage.png" });
// });
//
// test("Verify Arbeidsplassen DEV homepage loads", async ({ page }) => {
//   await page.goto("https://arbeidsplassen.intern.dev.nav.no/");
//
//   await expect(page).toHaveTitle(
//     "Arbeidsplassen.no - Alle ledige jobber, samlet på én plass"
//   );
//
//   await page.screenshot({ path: "screenshots/homepage-dev.png" }); // Changed filename to avoid overwrite
// });
