import { test, expect } from '@playwright/test';

const MPN = ["LM317T","1N4148W-TP","NE555P","BC547B","TL071CP","LM358P","CD4017BE","74HC595","ATMEGA328P-PU","STM32F103C8T6","ESP32-WROOM-32","PIC16F628A","2N2222A","IRLZ44N","AMS1117-3.3","TL072","SN74HC14N","LM7805","SS14","BSS138"];

for (const q of MPN) {
  test(`search smoke: ${q}`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox').fill(q);
    await page.getByRole('button', { name: /поиск/i }).click();

    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    await expect(table.getByRole('row')).toHaveCountGreaterThan(5);
  });
}
