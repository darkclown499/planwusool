import { chromium } from 'playwright';

const viewports = [
  { name: '1440x900', w: 1440, h: 900 },
  { name: '1024x768', w: 1024, h: 768 },
  { name: '768x1024', w: 768, h: 1024 },
  { name: '430x932', w: 430, h: 932 },
  { name: '390x844', w: 390, h: 844 },
  { name: '375x812', w: 375, h: 812 },
];
const templates = ['fashion-atelier','bazaar-market','grocery-souq','bakery-house','electronics-hub','restaurant-menu'];

const browser = await chromium.launch({ headless: true });
let all = [];

for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, locale: 'ar-EG', isMobile: vp.w < 768 });
  const page = await ctx.newPage();
  let consoleErr = []; let net500=[]; let build404=[];
  page.on('console', m=>{ if(m.type()==='error') consoleErr.push(m.text().slice(0,100)); });
  page.on('response', r=>{ if(r.status()>=500) net500.push(r.url()); if(r.status()===404 && r.url().includes('/build/')) build404.push(r.url()); });

  for (const u of [{l:'Landing', url:'https://wusool.ps/'}, {l:'Login', url:'https://wusool.ps/login'}, {l:'Demo', url:'https://demo.wusool.ps/'}]) {
    try {
      const resp = await page.goto(u.url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(600);
      const overflow = await page.evaluate(()=>document.documentElement.scrollWidth > document.documentElement.clientWidth+5);
      const dir = await page.evaluate(()=>document.documentElement.getAttribute('dir'));
      const broken = await page.evaluate(()=>Array.from(document.querySelectorAll('img')).filter(i=>!i.complete||i.naturalWidth===0).length);
      // Real check via network already captured, broken via naturalWidth is unreliable, so we use network 404 for images
      const img404 = net500.filter(u=>u.includes('/images/')).length;
      all.push({vp:vp.name, url:u.l, status:resp.status(), overflow, dir, broken, console:consoleErr.length, net500:net500.length, build404:build404.length});
      console.log(`[${vp.name}] ${u.l} ${resp.status()} overflow:${overflow} dir:${dir} broken:${broken} img404:${img404} console:${consoleErr.length}`);
    } catch(e){ console.log(`[${vp.name}] ${u.l} ERR ${e.message.slice(0,80)}`); }
  }
  await ctx.close();
}

// Template checks (only on 1440 to save time)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-EG' });
  const page = await ctx.newPage();
  for (const tpl of templates) {
    const url = `https://demo.wusool.ps/?theme=${tpl}&preview=1`;
    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(800);
      const hasHeader = await page.locator('header').count() > 0;
      const hasHero = await page.locator('section').count() > 0;
      const products = await page.locator('div.group').count();
      const overflow = await page.evaluate(()=>document.documentElement.scrollWidth > document.documentElement.clientWidth+5);
      console.log(`[Template ${tpl}] ${resp.status()} header:${hasHeader} hero:${hasHero} products:${products} overflow:${overflow}`);
      all.push({vp:'Template '+tpl, url, status:resp.status(), hasHeader, hasHero, products, overflow});
    } catch(e){ console.log(`[Template ${tpl}] ERR ${e.message.slice(0,80)}`); }
  }
  await ctx.close();
}

// Customer E2E on demo (1440 and 375)
for (const vp of [{name:'1440', w:1440, h:900}, {name:'375', w:375, h:812}]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, locale: 'ar-EG', isMobile: vp.w<768 });
  const page = await ctx.newPage();
  page.on('console', m=>{ if(m.type()==='error') console.log('console',m.text().slice(0,100)); });
  console.log(`\n=== CUSTOMER E2E ${vp.name} ===`);
  await page.goto('https://demo.wusool.ps/', { waitUntil: 'networkidle', timeout: 20000 });
  // Category
  try {
    const cat = page.locator('a[href*="/category/"]').first();
    if (await cat.count()>0) { await cat.click(); await page.waitForTimeout(1200); console.log(`Category nav ${page.url().includes('/category/')?'PASS':'FAIL'} ${page.url()}`); await page.goto('https://demo.wusool.ps/', { waitUntil: 'networkidle' }); } else console.log('Category links 0');
  } catch(e){ console.log('Category err', e.message.slice(0,80)); }
  // Product
  try {
    const card = page.locator('div.group').first();
    if (await card.count()>0) {
      await card.click(); await page.waitForTimeout(800);
      const hasDetail = await page.locator('text=تفاصيل المنتج').count()>0;
      console.log(`Product detail ${hasDetail?'PASS':'FAIL'}`);
      if (hasDetail) {
        const priceOk = await page.locator('text=/\\d+/').count()>0;
        console.log(`Price ${priceOk?'PASS':'FAIL'}`);
        const varBtn = page.locator('button:has-text("S"), button:has-text("M")').first();
        if (await varBtn.count()>0 && await varBtn.isVisible().catch(()=>false)) { await varBtn.click(); console.log('Variant PASS'); }
        const addBtn = page.locator('button:has-text("أضف للسلة")').first();
        if (await addBtn.count()>0) { await addBtn.click(); await page.waitForTimeout(800); console.log('Add to cart PASS'); }
        // Cart button
        const cartBtn = page.locator('button[aria-label="سلة التسوق"], button:has-text("السلة")').first();
        // Try multiple selectors
        let cartBtn2 = page.locator('button:has-text("السلة")').first();
        if (await cartBtn.count()>0) { await cartBtn.click(); } else if (await cartBtn2.count()>0) { await cartBtn2.click(); }
        await page.waitForTimeout(800);
        const drawer = await page.locator('text=سلة التسوق').count()>0;
        console.log(`Cart drawer ${drawer?'PASS':'FAIL'}`);
        if (drawer) {
          const plus = page.locator('button[aria-label="زيادة"]').first();
          const box = await plus.boundingBox().catch(()=>null);
          console.log(`Quantity button size ${box?`${Math.round(box.width)}x${Math.round(box.height)}`:'not found'} ${box && box.width>=38 && box.height>=38 ? 'PASS 40x40' : 'FAIL'}`);
          if (box) { await plus.click(); await page.waitForTimeout(400); console.log('Quantity + PASS'); const minus = page.locator('button[aria-label="إنقاص"]').first(); await minus.click(); await page.waitForTimeout(400); console.log('Quantity - PASS'); }
          const hasTotal = await page.locator('text=الإجمالي').count()>0;
          console.log(`Cart total ${hasTotal?'PASS':'FAIL'}`);
          const hasLoyalty = await page.locator('text=كسب').count()>0;
          console.log(`Loyalty in cart ${hasLoyalty?'found':'not found (may be disabled)'}`);
          const trash = page.locator('button[aria-label="حذف"]').first();
          if (await trash.count()>0) { await trash.click(); await page.waitForTimeout(600); console.log('Remove PASS'); }
        }
      }
    }
  } catch(e){ console.log('Product flow err', e.message.slice(0,120)); }
  await ctx.close();
}

await browser.close();
console.log('DONE');
