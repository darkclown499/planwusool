/**
 * Unit tests for resources/js/utils/date-helper.ts formatCustomerDate() —
 * the customer-facing order date formatter used by storefront surfaces
 * (My Orders modal, order details modal, order invoice).
 *
 * Built with esbuild (already installed via node_modules) and run with plain
 * node, mirroring tests/js/order-status/customer-label.test.mjs.
 *
 * Run from the repository root:
 *
 *   node tests/js/date-format/customer-date.test.mjs
 *
 * Semantics under test:
 *   - valid UTC ISO order timestamps render localized, human-readable output;
 *   - the raw ISO string (T / Z / 000000) is never shown;
 *   - Arabic storefront locale renders readable Arabic (Gregorian, Arabic-Indic);
 *   - English storefront locale renders readable English;
 *   - null / undefined / empty / invalid values render a neutral "—", never
 *     "Invalid Date" or "NaN";
 *   - the shared helper is the formatter wired into the intended customer
 *     surfaces (CustomerModals + UnifiedInvoice), not a duplicated inline formatter;
 *   - timezone contract: API sends UTC ISO; default rendering is browser-local
 *     and an explicit timeZone option renders the correct date/day deterministically.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require.resolve('esbuild/bin/esbuild');
const src = join(__dirname, '..', '..', '..', 'resources', 'js', 'utils', 'date-helper.ts');
const out = join(os.tmpdir(), 'wusool-customer-date-test.cjs');

execFileSync(process.execPath, [
  esbuild,
  src,
  '--bundle',
  '--platform=node',
  '--format=cjs',
  `--outfile=${out}`,
]);

const { formatCustomerDate } = require(out);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

console.log('Wusool — customer order date format tests\n');

// Fixture: exact UTC ISO shape the backend sends (created_at->toISOString()).
const ISO = '2026-09-09T12:34:56.000000Z';

// 1. Valid ISO date formats human-readably (with time for order list rows).
const ar = formatCustomerDate(ISO, { locale: 'ar', withTime: true, timeZone: 'UTC' });
const en = formatCustomerDate(ISO, { locale: 'en', withTime: true, timeZone: 'UTC' });
assert(typeof ar === 'string' && ar.length > 0, 'Arabic output is a non-empty string');
assert(typeof en === 'string' && en.length > 0, 'English output is a non-empty string');

// 2. Raw ISO string is NEVER displayed.
const RAW_ISO_TOKENS = /T12:34:56|\.000000Z|Z\b|2026-09-09/;
assert(!RAW_ISO_TOKENS.test(ar), 'Arabic output does not leak the raw ISO string');
assert(!RAW_ISO_TOKENS.test(en), 'English output does not leak the raw ISO string');
assert(!ar.includes('Invalid Date') && !ar.includes('NaN'), 'Arabic never shows Invalid Date/NaN');
assert(!en.includes('Invalid Date') && !en.includes('NaN'), 'English never shows Invalid Date/NaN');

// 3. Arabic locale → readable Gregory/Arabic-Indic output (ar-EG convention).
assert(ar.includes('سبتمبر'), 'Arabic month name appears');
assert(ar.includes('٢٠٢٦'), 'Arabic-Indic year appears');
assert(ar.includes('م'), 'Arabic PM marker appears for 12:34 PM');
assert(ar === '٩ سبتمبر ٢٠٢٦ في ١٢:٣٤ م', 'Arabic full rendering matches expected fixture');

// Date-only variant (order details shipped date / timeline) stays date-only.
assert(formatCustomerDate(ISO, { locale: 'ar', timeZone: 'UTC' }) === '٩ سبتمبر ٢٠٢٦', 'Arabic date-only renders without time');

// 4. English locale renders localized English, not Arabic.
assert(en === 'September 9, 2026 at 12:34 PM', 'English full rendering matches expected fixture');
assert(formatCustomerDate(ISO, { locale: 'en', timeZone: 'UTC' }) === 'September 9, 2026', 'English date-only renders without time');

// 5. Nullish/empty values → neutral em dash.
assert(formatCustomerDate(null) === '—', 'null → —');
assert(formatCustomerDate(undefined) === '—', 'undefined → —');
assert(formatCustomerDate('') === '—', 'empty string → —');

// 6. Invalid values → neutral em dash, never raw garbage.
assert(formatCustomerDate('not-a-date') === '—', 'invalid date string → —');
assert(formatCustomerDate('2026-13-45T99:99:99Z') === '—', 'out-of-range date → —');
assert(formatCustomerDate(NaN) === '—', 'NaN date → —');
assert(formatCustomerDate(0) !== '—', 'epoch (0) renders as a real date, not fallback');

// 7. Timezone contract — default is browser-local; explicit timeZone renders the
//    correct date/day deterministically for the fixture.
const noTz = formatCustomerDate(ISO, { locale: 'en', withTime: true });
const expectedLocal = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(new Date(ISO));
assert(noTz === expectedLocal, 'default formatting uses the browser-local timezone (no manual shift)');
const utcEn = formatCustomerDate(ISO, { locale: 'en', timeZone: 'UTC' });
assert(utcEn === 'September 9, 2026', 'UTC timeZone renders the expected calendar date');
const shifted = formatCustomerDate('2026-09-09T23:34:56.000000Z', { locale: 'en', withTime: true, timeZone: 'UTC' });
assert(shifted === 'September 9, 2026 at 11:34 PM', 'timeZone-aware rendering keeps the correct day/hour');

// 8. Same helper used in the intended customer surfaces (source assertion) — the
//    surfaces must import the shared helper rather than re-inline date logic.
const root = join(__dirname, '..', '..', '..');
const modals = readFileSync(join(root, 'resources', 'js', 'templates-v2', 'shared', 'neutral', 'CustomerModals.tsx'), 'utf8');
const invoice = readFileSync(join(root, 'resources', 'js', 'components', 'storefront', 'UnifiedInvoice.tsx'), 'utf8');
assert(modals.includes("formatCustomerDate") && modals.includes("from '@/utils/date-helper'"), 'CustomerModals imports the shared helper');
assert(invoice.includes("formatCustomerDate") && invoice.includes("from '@/utils/date-helper'"), 'UnifiedInvoice imports the shared helper');
assert(!modals.includes("{order.created_at || order.date}"), 'My Orders modal no longer renders the raw ISO directly');
assert(!modals.includes("toLocaleDateString('ar-EG')"), 'customer modals no longer hardcode ar-EG inline');
assert(!invoice.includes("toLocaleDateString('ar-SA')"), 'invoice no longer hardcodes ar-SA (Hijri) inline');

// 8b. Status labels remain canonical (unchanged contract) — the shared customer
//     order surfaces still call customerOrderStatusLabel.
assert(modals.includes('customerOrderStatusLabel(order.status)'), 'customer modals keep canonical status labels');
assert(invoice.includes('customerOrderStatusLabel(order.status)'), 'invoice keeps canonical status labels');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);