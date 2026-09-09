/**
 * Unit tests for customer-facing storefront date surfaces aligned on the
 * canonical B3-04 helper formatCustomerDate():
 *   resources/js/components/storefront/DownloadsModal.tsx  (digital download expiry)
 *   resources/js/components/storefront/LoyaltyOverview.tsx (loyalty history date)
 *   resources/js/components/storefront/ProductReviews.tsx  (review date)
 *
 * Built with esbuild (already installed via node_modules) and run with plain
 * node, mirroring tests/js/date-format/customer-date.test.mjs.
 *
 * Run from the repository root:
 *
 *   node tests/js/date-format/customer-date-surfaces.test.mjs
 *
 * Semantics under test:
 *   - the three surfaces import the SHARED helper (no duplicated date logic);
 *   - none of them still render raw ISO strings, toLocaleDateString outputs, or
 *     a hardcoded ar-EG locale dump;
 *   - localized outputs for Arabic (ar-EG), English (en-US) and Hebrew (he);
 *   - null / invalid / empty values render the neutral em dash fallback via the
 *     shared helper;
 *   - date-only rendering does not shift the calendar day and no surface adds a
 *     manual timezone offset (browser-local default is preserved);
 *   - the existing B3-04 helper behavior is untouched.
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
const out = join(os.tmpdir(), 'wusool-customer-date-surfaces-test.cjs');

execFileSync(process.execPath, [esbuild, src, '--bundle', '--platform=node', '--format=cjs', `--outfile=${out}`]);

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

console.log('Wusool — customer-facing storefront date surfaces\n');

// Fixture: exact UTC ISO shape the backend sends (toISOString()/toIso8601String()).
const ISO = '2026-09-09T12:34:56.000000Z';

// 1. DownloadsModal — digital download expiry (api.digital-downloads.index).
const dlAr = formatCustomerDate(ISO, { locale: 'ar' });
const dlEn = formatCustomerDate(ISO, { locale: 'en' });
const dlHe = formatCustomerDate(ISO, { locale: 'he' });
assert(dlAr === '٩ سبتمبر ٢٠٢٦', 'Downloads: Arabic expiry renders ar-EG Gregorian (date-only)');
assert(dlEn === 'September 9, 2026', 'Downloads: English expiry renders en-US (date-only)');
assert(dlHe === '9 בספטמבר 2026', 'Downloads: Hebrew expiry renders Hebrew (date-only)');
assert(!/T12:34:56|\.000000Z|\bZ\b|2026-09-09/.test(dlEn), 'Downloads: raw ISO never leaks');
assert(dlEn.includes('Invalid Date') === false && dlEn.includes('NaN') === false, 'Downloads: never Invalid Date/NaN');

// 2. LoyaltyOverview — loyalty history record createdAt (api.loyalty.history).
const lyAr = formatCustomerDate(ISO, { locale: 'ar' });
const lyEn = formatCustomerDate(ISO, { locale: 'en' });
assert(lyAr === '٩ سبتمبر ٢٠٢٦', 'Loyalty: Arabic history date renders ar-EG Gregorian');
assert(lyEn === 'September 9, 2026', 'Loyalty: English history date renders en-US (not Arabic)');
assert(!/T12:34:56|\.000000Z|\bZ\b|2026-09-09/.test(lyEn), 'Loyalty: raw ISO never leaks');

// 3. ProductReviews — review createdAt (api.reviews.product).
const rvAr = formatCustomerDate(ISO, { locale: 'ar' });
const rvEn = formatCustomerDate(ISO, { locale: 'en' });
const rvHe = formatCustomerDate(ISO, { locale: 'he' });
assert(rvAr === '٩ سبتمبر ٢٠٢٦', 'Reviews: Arabic review date renders ar-EG Gregorian');
assert(rvEn === 'September 9, 2026', 'Reviews: English review date renders en-US');
assert(rvHe === '9 בספטמבר 2026', 'Reviews: Hebrew review date renders Hebrew');
assert(!rvEn.includes('Invalid Date') && !rvEn.includes('NaN'), 'Reviews: never Invalid Date/NaN');

// 4. Null / invalid / empty → neutral em dash through the shared helper.
assert(formatCustomerDate(null, { locale: 'en' }) === '—', 'null → —');
assert(formatCustomerDate(undefined, { locale: 'en' }) === '—', 'undefined → —');
assert(formatCustomerDate('', { locale: 'en' }) === '—', 'empty string → —');
assert(formatCustomerDate('not-a-date', { locale: 'en' }) === '—', 'invalid date → —');
assert(formatCustomerDate('2026-13-45T99:99:99Z', { locale: 'en' }) === '—', 'out-of-range date → —');

// 5. Date-only safety: no silent day shift and no manual timezone offset is
//    introduced (the surfaces render browser-local, exactly like before).
const utcDay = formatCustomerDate('2026-09-09T00:00:00.000000Z', { locale: 'en', timeZone: 'UTC' });
assert(utcDay === 'September 9, 2026', 'date-only value in UTC does not shift the calendar day');
const brTz = formatCustomerDate(ISO, { locale: 'en' });
const expectedLocal = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(ISO));
assert(brTz === expectedLocal, 'surfaces default to browser-local timezone (no manual shift)');

// 6. Shared helper reused — the three surfaces must import the canonical helper
//    and must NOT inline their own date logic.
const root = join(__dirname, '..', '..', '..');
const downloads = readFileSync(join(root, 'resources', 'js', 'components', 'storefront', 'DownloadsModal.tsx'), 'utf8');
const loyalty = readFileSync(join(root, 'resources', 'js', 'components', 'storefront', 'LoyaltyOverview.tsx'), 'utf8');
const reviews = readFileSync(join(root, 'resources', 'js', 'components', 'storefront', 'ProductReviews.tsx'), 'utf8');

for (const [name, content] of [
    ['DownloadsModal', downloads],
    ['LoyaltyOverview', loyalty],
    ['ProductReviews', reviews],
]) {
    assert(content.includes('formatCustomerDate') && content.includes("from '@/utils/date-helper'"), `${name} imports the shared helper`);
    assert(!content.includes('toLocaleDateString'), `${name} no longer inlines toLocaleDateString`);
    assert(!content.includes('new Date('), `${name} no longer constructs raw display dates`);
}
assert(!loyalty.includes("toLocaleDateString('ar-EG')"), 'LoyaltyOverview no longer hardcodes ar-EG inline');
assert(!loyalty.includes('.toLocaleString('), 'LoyaltyOverview no longer inlines browser date formatting');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
