import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
await p.goto('http://127.0.0.1:8000/login', { waitUntil: 'load' });
await p.waitForSelector('#email');
await p.fill('#email', 'superadmin@example.com');
await p.fill('#password', 'password');
await p.click('button[type=submit]');
await p.waitForURL('**/dashboard');
await p.waitForTimeout(2500);

const allButtons = await p.locator('[data-slot="sidebar"] button').count();
console.log('sidebar buttons:', allButtons);
const chevronButtons = await p.locator('[data-slot="sidebar"] button:has(svg.lucide-chevron-down)').count();
console.log('chevron buttons:', chevronButtons);

// print first few buttons text
for (let i = 0; i < Math.min(allButtons, 10); i++) {
  const txt = await p.locator('[data-slot="sidebar"] button').nth(i).innerText().catch(() => '?');
  console.log('btn', i, JSON.stringify(txt));
}

// click chevron buttons
for (let i = 0; i < chevronButtons; i++) {
  await p.locator('[data-slot="sidebar"] button:has(svg.lucide-chevron-down)').nth(i).click({ timeout: 3000 }).catch((e) => console.log('click fail', i, e.message));
}
await p.waitForTimeout(1000);

const hrefs = await p.$$eval('[data-slot="sidebar"] a[href]', (els) => els.map((a) => a.getAttribute('href')).filter(Boolean));
console.log('links after expand:', hrefs.length, JSON.stringify(hrefs));
await b.close();
