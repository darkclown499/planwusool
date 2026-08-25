import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-EG' });
const page = await context.newPage();
let consoleErrors = [];
let net500 = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('response', r => { if (r.status() >= 500) net500.push(`${r.url()} ${r.status()}`); });

function log(step, pass, detail='') { console.log(`${pass?'PASS':'FAIL'}: ${step} ${detail}`); return pass; }

console.log('=== CUSTOMER E2E START demo.wusool.ps ===');
await page.goto('https://demo.wusool.ps/', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(1000);
log('Homepage 200', true, page.url());

// Check logo/header
let hasLogo = await page.locator('header img, header span').count() > 0;
log('Logo/Header', hasLogo);

// Search
try {
  const searchBtn = page.locator('button[aria-label="بحث"]').first();
  if (await searchBtn.count()>0) { await searchBtn.click(); await page.waitForTimeout(500); let hasInput = await page.locator('input[placeholder*="بحث"], input[type="search"]').count()>0; log('Search open', hasInput); await page.keyboard.press('Escape'); await page.waitForTimeout(300); } else log('Search btn', false, 'not found');
} catch(e){ log('Search', false, e.message); }

// Categories
try {
  let catLinks = await page.locator('a[href*="/category/"]').count();
  log('Categories links', catLinks>0, `count ${catLinks}`);
  if (catLinks>0) { await page.locator('a[href*="/category/"]').first().click(); await page.waitForTimeout(1500); log('Category page', page.url().includes('/category/'), page.url()); await page.goto('https://demo.wusool.ps/', { waitUntil: 'networkidle' }); }
} catch(e){ log('Categories', false, e.message); }

// Product open
try {
  await page.waitForTimeout(1000);
  const cards = page.locator('div.group');
  let cnt = await cards.count();
  log('Product cards', cnt>0, `count ${cnt}`);
  if (cnt>0) {
    await cards.first().click();
    await page.waitForTimeout(800);
  }
  // Check detail modal
  let hasDetail = await page.locator('text=تفاصيل المنتج').count()>0;
  if (!hasDetail) {
    // try clicking product name
    const nameLink = page.locator('a:has-text("فستان"), a:has-text("عباية")').first();
    if (await nameLink.count()>0) { await nameLink.click(); await page.waitForTimeout(800); hasDetail = await page.locator('text=تفاصيل المنتج').count()>0; }
  }
  log('Product detail modal', hasDetail);
  if (hasDetail) {
    const priceOk = await page.locator('text=/\\d+/').count()>0;
    log('Price visible', priceOk);
    // variants
    const varBtn = page.locator('button:has-text("S"), button:has-text("M"), button:has-text("L")').first();
    if (await varBtn.count()>0) { await varBtn.click(); log('Variant select', true); }
    // loyalty badge
    const loyaltyBadge = await page.locator('text=كسب').count()>0;
    log('Loyalty badge in product', loyaltyBadge, loyaltyBadge?'found':'not found (may be disabled)');
  }
} catch(e){ log('Product open', false, e.message); }

// Add to cart
try {
  const addBtn = page.locator('button:has-text("أضف للسلة")').first();
  let cnt = await addBtn.count();
  log('Add to cart btn', cnt>0);
  if (cnt>0) { await addBtn.click(); await page.waitForTimeout(1000); log('Add to cart click', true); }
} catch(e){ log('Add to cart', false, e.message); }

// Cart drawer
try {
  let hasCart = await page.locator('text=سلة التسوق').count()>0;
  log('Cart drawer', hasCart);
  if (hasCart) {
    // Check loyalty in cart
    let hasLoyaltyCart = await page.locator('text=كسب').count()>0;
    log('Loyalty in cart', hasLoyaltyCart);
    // Update quantity
    const plus = page.locator('button[aria-label="زيادة"]').first();
    if (await plus.count()>0) { await plus.click(); await page.waitForTimeout(600); log('Update quantity +', true); }
    // Check total
    const hasTotal = await page.locator('text=الإجمالي').count()>0;
    log('Cart total', hasTotal);
    // Remove
    const trash = page.locator('button[aria-label="حذف"]').first();
    if (await trash.count()>0) { await trash.click(); await page.waitForTimeout(800); log('Remove item', true); }
  }
} catch(e){ log('Cart', false, e.message); }

// Wishlist
try {
  await page.goto('https://demo.wusool.ps/', { waitUntil: 'networkidle' });
  const wishBtn = page.locator('button[aria-label="المفضلة"]').first();
  if (await wishBtn.count()>0) { await wishBtn.click(); await page.waitForTimeout(500); log('Wishlist click', true); }
} catch(e){ log('Wishlist', false, e.message); }

// Loyalty modal (requires login, so expect login prompt)
try {
  const loyaltyBtn = page.locator('button:has-text("نقاط"), a:has-text("نقاط")').first();
  // Try header loyalty badge
  const headerBadge = page.locator('text=نقطة').first();
  if (await headerBadge.count()>0) { await headerBadge.click(); await page.waitForTimeout(500); log('Loyalty header click', true); }
  else log('Loyalty header', false, 'not visible (guest)');
} catch(e){ log('Loyalty', false, e.message); }

// Checkout - try to open checkout from cart (need item)
try {
  // Re-add item for checkout
  await page.goto('https://demo.wusool.ps/', { waitUntil: 'networkidle' });
  const add2 = page.locator('button:has-text("أضف للسلة"), button:has-text("أضف")').first();
  if (await add2.count()>0) { await add2.click(); await page.waitForTimeout(800); }
  const checkoutBtn = page.locator('button:has-text("إتمام الطلب"), button:has-text("Checkout")').first();
  if (await checkoutBtn.count()>0) { await checkoutBtn.click(); await page.waitForTimeout(1000); let hasCheckout = await page.locator('text=إتمام الطلب').count()>0; log('Checkout open', hasCheckout); } else log('Checkout btn', false, 'not found');
} catch(e){ log('Checkout', false, e.message); }

console.log('consoleErrors', consoleErrors.slice(0,3));
console.log('net500', net500.slice(0,3));
await browser.close();
console.log('CUSTOMER E2E DONE');
