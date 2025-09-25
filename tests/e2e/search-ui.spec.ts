import { test, expect } from '@playwright/test';

// сопоставление названий колонок → индекс
async function columnIndex(page, name: string) {
  const headers = page.locator('table thead th');
  const count = await headers.count();
  for (let i=0;i<count;i++){
    const t = (await headers.nth(i).innerText()).trim().toLowerCase();
    if (t.includes(name.toLowerCase())) return i;
  }
  return -1;
}

test('Поиск LM317T: таблица не пуста, маппинг колонок корректен', async ({ page }) => {
  await page.goto('/?q=LM317T');

  const table = page.locator('table');
  await expect(table).toBeVisible();

  // Ждём загрузки данных - проверяем что появились строки в таблице
  await page.waitForFunction(() => {
    const tbody = document.querySelector('table tbody');
    const rows = tbody ? tbody.querySelectorAll('tr') : [];
    console.log('Rows found:', rows.length);
    return rows.length > 10;
  }, { timeout: 15000 });

  // Проверяем что получилось
  const sumText = await page.locator('#sum').textContent();
  console.log('Final sum text:', sumText);

  const idxMpn  = await columnIndex(page, 'mpn');
  const idxDesc = await columnIndex(page, 'description');
  const idxPack = await columnIndex(page, 'package');
  const idxPkg  = await columnIndex(page, 'packaging');
  const idxReg  = await columnIndex(page, 'regions');
  const idxStock= await columnIndex(page, 'stock');
  const idxMin  = await columnIndex(page, 'min');

  expect(idxMpn).toBeGreaterThanOrEqual(0);
  expect(idxDesc).toBeGreaterThanOrEqual(0);
  expect(idxPack).toBeGreaterThanOrEqual(0);
  expect(idxPkg).toBeGreaterThanOrEqual(0);
  expect(idxReg).toBeGreaterThanOrEqual(0);
  expect(idxStock).toBeGreaterThanOrEqual(0);
  expect(idxMin).toBeGreaterThanOrEqual(0);

  const rows = table.locator('tbody tr');
  expect(await rows.count()).toBeGreaterThan(15);

  // проверяем первые 5 строк на здравость данных
  const n = Math.min(await rows.count(), 5);
  for (let r=0;r<n;r++){
    const cells = rows.nth(r).locator('td');
    const mpn   = (await cells.nth(idxMpn).innerText()).trim();
    const desc  = (await cells.nth(idxDesc).innerText()).trim();
    const pack  = (await cells.nth(idxPack).innerText()).trim();
    const pkg   = (await cells.nth(idxPkg).innerText()).trim();
    const regs  = (await cells.nth(idxReg).innerText()).trim();
    const stock = (await cells.nth(idxStock).innerText()).replace(/\s/g,'');
    const min   = (await cells.nth(idxMin).innerText()).replace(',', '.');

    // MPN должен быть не пустой
    expect(mpn.length).toBeGreaterThan(0);
    
    // regions не должен «просачиваться» в описание
    expect(/^(EU|US|RU|ASIA)/.test(desc)).toBeFalsy();
    
    // package выглядит как корпус (TO-|SOD|SOIC|QFN|DIP) или пустой
    if (pack.trim()) {
      expect(/TO-|SOD|SOIC|QFN|DIP|TSSOP|QFP/i.test(pack)).toBeTruthy();
    }
    
    // packaging — Tape/Tube/Reel/Tray/Cut или пустой
    if (pkg.trim()) {
      expect(/Tape|Tube|Reel|Tray|Cut|Bulk/i.test(pkg)).toBeTruthy();
    }
    
    // мин цена ₽ — содержит цифры или тире
    expect(/[\d.₽—\-]/.test(min)).toBeTruthy();
  }
});
