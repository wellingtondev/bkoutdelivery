const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const output = path.resolve('dist/qa-selected-day');
  fs.mkdirSync(output, { recursive: true });
  const key = date => new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
  const today = key(new Date());
  try {
    for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
      const page = await browser.newPage({viewport,timezoneId:'America/Sao_Paulo'});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:4201/entregador');
      await page.locator('.selected-day-fee').waitFor();
      assert.match(await page.locator('.selected-day-fee').innerText(), /80,00/);
      for (const [daysAgo, fee, customer] of [[1,12,'Cliente de ontem'],[7,15,'Cliente da semana passada']]) {
        const date = key(new Date(Date.now()-daysAgo*86400000));
        if(date.slice(0,7)!==today.slice(0,7)) await page.getByRole('button',{name:'Mês anterior do histórico',exact:true}).click();
        await page.getByRole('button',{name:new RegExp(`^${date}:`)}).click();
        const summary = page.locator('.selected-day-total');
        assert.match(await page.locator('.selected-day-fee').innerText(),new RegExp(`${fee},00`));
        assert.match(await summary.innerText(),new RegExp(date.split('-').reverse().join('/')));
        assert.match(await page.locator('.day-detail').innerText(),new RegExp(customer));
        assert.equal(await page.locator('.day-detail .delivery-fee').count(),1);
        await page.getByRole('button',{name:'Hoje',exact:true}).click();
      }
      await page.getByRole('button',{name:'Mês anterior do histórico',exact:true}).click();
      await page.locator('.days button').filter({has:page.locator('span',{hasText:/^15$/})}).click();
      assert.match(await page.locator('.selected-day-fee').innerText(),/18,00/);
      assert.match(await page.locator('.day-detail').innerText(),/Cliente do mes passado/);
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({path:path.join(output,`history-${viewport.width}.png`),fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
      await page.getByRole('button',{name:'Hoje',exact:true}).click();
      assert.match(await page.locator('.selected-day-fee').innerText(),/80,00/);
      assert.deepEqual(errors,[]);
      console.log(`PASS ${viewport.width}x${viewport.height}: today80, yesterday12, weekago15, previousmonth18, returningtoday80; no overflow/pageerrors`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
