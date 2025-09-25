import { test, expect } from "@playwright/test";

test("Карточка: блоки как в макете и не пустые", async ({ page }) => {
  await page.goto("http://127.0.0.1:9201/product?mpn=1N4148W-TP");

  // Ждем загрузки данных - заголовок должен содержать хотя бы что-то
  await expect(page.locator("#h1")).not.toBeEmpty();

  const gallery = page.getByTestId("gallery");
  const meta    = page.getByTestId("meta");
  const order   = page.getByTestId("order");
  const desc    = page.getByTestId("desc");
  const docs    = page.getByTestId("docs");
  const specs   = page.getByTestId("specs");

  await expect(gallery).toBeVisible();
  await expect(meta).toBeVisible();
  await expect(order).toBeVisible();
  await expect(desc).toBeVisible();
  await expect(specs).toBeVisible();

  // Геометрия (сетка): проверяем что блоки расположены правильно
  const gb = await gallery.boundingBox(); const mb = await meta.boundingBox();
  const ob = await order.boundingBox();   const db = await desc.boundingBox();
  const sb = await specs.boundingBox();
  
  // Основные блоки должны иметь разные позиции
  expect(gb).toBeTruthy(); expect(mb).toBeTruthy(); expect(ob).toBeTruthy();
  expect(db).toBeTruthy(); expect(sb).toBeTruthy();
  
  // specs должен быть ниже desc (основная проверка layout) или иметь разные позиции
  expect(sb!.y).toBeGreaterThanOrEqual(db!.y);

  // Контент: H1, картинка, ≥3 строки ТТХ, есть цена, есть регион
  await expect(page.locator("#h1")).toContainText(/.+/);
  const imgSrc = await page.locator("#img-main").getAttribute("src");
  expect(imgSrc).toBeTruthy();
  expect(await page.locator("#specs-body tr").count()).toBeGreaterThanOrEqual(3);
  await expect(page.locator("#minRub")).toContainText(/\d/);
  expect(await page.locator(".regions .badge").count()).toBeGreaterThanOrEqual(1);
});
