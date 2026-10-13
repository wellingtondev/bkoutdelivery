const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    for (const width of [1440,390]) {
      const page = await browser.newPage({viewport:{width,height:900},timezoneId:'America/Sao_Paulo'});
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route(/https:\/\/(maps|places|routes)\.googleapis\.com\/.*/,route=>route.abort());
      await page.goto('http://127.0.0.1:4203/entregador');
      await page.locator('.selected-day-fee').waitFor();
      assert.equal(await page.locator('.selected-day-fee').evaluate(e=>getComputedStyle(e).color),'rgb(255, 131, 120)');
      await page.getByRole('button',{name:'Período',exact:true}).click();
      assert.equal(await page.getByLabel('Data inicial').isVisible(),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.goto('http://127.0.0.1:4203/loja');
      await page.locator('.shipment').filter({has:page.locator('.time',{hasText:'15:30'})}).getByRole('button').click();
      await page.getByRole('button',{name:'Alterar entrega',exact:true}).click();
      const form=page.locator('form[aria-labelledby="delivery-title"]');
      const select=form.locator('select[name="ship"]');
      assert.equal(await select.isEnabled(),true);
      assert.equal(await select.locator('option').count(),2);
      assert.match(await select.innerText(),/15:30/);
      assert.match(await select.innerText(),/18:00/);
      assert.doesNotMatch(await select.innerText(),/12:30/);
      await select.selectOption('fixture-shipment');
      await form.getByRole('button',{name:'Salvar alterações',exact:true}).click();
      await form.waitFor({state:'hidden'});
      assert.match(await page.locator('.list h2').innerText(),/18:00/);
      assert.match(await page.locator('.list').innerText(),/Diego/);
      assert.equal(await page.locator('.list a').last().getAttribute('href'),'/track/demo');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual(errors,[]);
      console.log(`PASS ${width}: red highlights, period retained, 15:30 to 18:00, earlier slots excluded, same tracking, no overflow/pageerrors`);
      await page.close();
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
