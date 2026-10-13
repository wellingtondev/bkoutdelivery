const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const output = path.resolve('dist/qa-remessa-historico');
  fs.mkdirSync(output, { recursive: true });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport, timezoneId: 'America/Sao_Paulo' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route(/https:\/\/(maps|places|routes)\.googleapis\.com\/.*/, route => route.abort());
      await page.goto('http://127.0.0.1:4201/entregador');
      await page.locator('.period-total h3').waitFor();
      assert.match(await page.locator('.period-total h3').innerText(), /80,00/);
      await page.getByRole('button', { name: 'Semana', exact: true }).click();
      // Yesterday can fall outside the current week on Monday.
      const isMonday = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getDay() === 1;
      assert.match(await page.locator('.period-total h3').innerText(), isMonday ? /80,00/ : /92,00/);
      await page.getByRole('button', { name: 'Mês', exact: true }).click();
      const day = Number(new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date()));
      const monthTotal = 80 + (day > 1 ? 12 : 0) + (day > 7 ? 15 : 0);
      assert.match(await page.locator('.period-total h3').innerText(), new RegExp(`${monthTotal},00`));
      await page.locator('.days button.current-day').click();
      assert.equal(await page.getByRole('button', { name: 'Dia', exact: true }).getAttribute('aria-pressed'), 'true');
      assert.match(await page.locator('.day-fee').innerText(), /80,00/);
      assert.equal(await page.locator('.day-detail .delivery-fee').count(), 10);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(output, `history-${viewport.width}.png`), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);

      await page.goto('http://127.0.0.1:4201/loja');
      await page.locator('.shipment').filter({ has: page.locator('.time', { hasText: '18:00' }) }).getByRole('button').click();
      await page.getByRole('button', { name: 'Alterar entrega', exact: true }).last().click();
      const form = page.locator('form[aria-labelledby="delivery-title"]');
      const select = form.locator('select[name="ship"]');
      assert.equal(await select.isEnabled(), true);
      assert.equal(await select.locator('option').count(), 2);
      await select.selectOption('fixture-afternoon');
      await form.screenshot({ path: path.join(output, `store-edit-${viewport.width}.png`) });
      await form.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
      await form.waitFor({ state: 'hidden' });
      assert.match(await page.locator('.list h2').innerText(), /15:30/);
      assert.match(await page.locator('.list').innerText(), /Diego/);
      assert.equal(await page.locator('.list a').first().getAttribute('href'), '/track/demo');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      assert.deepEqual(errors, []);
      console.log(`Browser QA passed ${viewport.width}x${viewport.height}: periods, day totals, shipment selection/save, preserved tracking, no overflow or page errors`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
