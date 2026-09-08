/**
 * Unit tests for resources/js/utils/order-status.ts customerOrderStatusLabel() —
 * the customer-facing order status label used by storefront surfaces (My Orders
 * modal, order details modal, order invoice).
 *
 * Built with esbuild (already installed via node_modules) and run with plain
 * node, mirroring tests/js/tracking/dedup.test.mjs.
 *
 * Run from the repository root:
 *
 *   node tests/js/order-status/customer-label.test.mjs
 *
 * Semantics under test:
 *   - known statuses map to canonical Arabic customer labels;
 *   - unknown/internal statuses get a safe neutral fallback — never the raw
 *     English status and never a known-state label;
 *   - nullish statuses are safe;
 *   - merchant tOrderStatus() keeps its raw-key fallback (unchanged contract).
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import os from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require.resolve('esbuild/bin/esbuild');
const src = join(__dirname, '..', '..', '..', 'resources', 'js', 'utils', 'order-status.ts');
const out = join(os.tmpdir(), 'wusool-order-status-test.cjs');

execFileSync(process.execPath, [
  esbuild,
  src,
  '--bundle',
  '--platform=node',
  '--format=cjs',
  `--outfile=${out}`,
]);

const { customerOrderStatusLabel, tOrderStatus } = require(out);

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

console.log('Wusool — customer order status label tests\n');

// 1. Known statuses render canonical Arabic customer labels.
assert(customerOrderStatusLabel('pending') === 'قيد الانتظار', 'pending → قيد الانتظار');
assert(customerOrderStatusLabel('confirmed') === 'مؤكد', 'confirmed → مؤكد');
assert(customerOrderStatusLabel('processing') === 'قيد التجهيز', 'processing → قيد التجهيز');
assert(customerOrderStatusLabel('shipped') === 'تم الشحن', 'shipped → تم الشحن');
assert(customerOrderStatusLabel('delivered') === 'تم التسليم', 'delivered → تم التسليم');
assert(customerOrderStatusLabel('cancelled') === 'ملغي', 'cancelled → ملغي');
assert(customerOrderStatusLabel('failed') === 'فشل', 'failed → فشل');
assert(customerOrderStatusLabel('refunded') === 'مسترجع', 'refunded → مسترجع');
assert(customerOrderStatusLabel('returned') === 'مرتجع', 'returned → مرتجع');
assert(customerOrderStatusLabel('completed') === 'مكتمل', 'completed → مكتمل');

// 2. Never returns the raw English status for a known state.
for (const raw of ['pending', 'shipped', 'delivered', 'cancelled', 'processing', 'failed']) {
  assert(customerOrderStatusLabel(raw) !== raw, `${raw} is not shown raw`);
}

// 3. Unknown/internal status → safe neutral fallback, never raw, never a known state.
const unknown = customerOrderStatusLabel('some_future_status');
assert(unknown === '—', 'unknown status → neutral fallback');
assert(unknown !== 'some_future_status', 'unknown status does not leak raw English');
assert(!orderStatusArLookup(unknown), 'unknown status does not resolve to a known label');

function orderStatusArLookup(value) {
  const allowed = new Set(['قيد الانتظار', 'مؤكد', 'قيد التجهيز', 'تم الشحن', 'تم التسليم', 'ملغي', 'فشل', 'مسترجع', 'مرتجع', 'مكتمل', 'تم إنشاء الطلب']);
  return allowed.has(value);
}

// 4. Humanized legacy keys still map (e.g. legacy 'Order Placed' payloads).
assert(customerOrderStatusLabel('Order Placed') === 'تم إنشاء الطلب', 'Order Placed → تم إنشاء الطلب');

// 5. Nullish input stays safe (no throw, no undefined/null leaking).
assert(customerOrderStatusLabel(undefined) === '—', 'undefined → neutral fallback');
assert(customerOrderStatusLabel(null) === '—', 'null → neutral fallback');
assert(customerOrderStatusLabel('') === '—', 'empty string → neutral fallback');
assert(![undefined, null, ''].includes(customerOrderStatusLabel(undefined)), 'no undefined/null leaks');

// 6. Merchant contract unchanged: tOrderStatus keeps raw fallback for unknown.
assert(tOrderStatus('some_future_status') === 'some_future_status', 'merchant tOrderStatus keeps raw fallback');
assert(tOrderStatus('pending') === 'قيد الانتظار', 'merchant tOrderStatus still maps known states');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);