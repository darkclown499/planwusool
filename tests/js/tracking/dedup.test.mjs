/**
 * Unit tests for resources/js/tracking/dedup.ts — the pure (framework-free,
 * window-free) Social Commerce purchase-dedup state machine (pending/sent).
 *
 * The module is compiled from TypeScript with esbuild (already installed via
 * node_modules) and exercised with a tiny in-memory StorageLike backend, so the
 * tests run with plain `node` — no test runner dependency is added.
 *
 * Run from the repository root:
 *
 *   node tests/js/tracking/dedup.test.mjs
 *
 * Semantics under test (see dedup.ts):
 *   - successful purchase → SENT; later invocation blocked;
 *   - second invocation (recent PENDING) blocked → concurrent tab protection;
 *   - failed payload fetch → PENDING cleared → retry allowed;
 *   - stale PENDING (TTL expired) → retry allowed;
 *   - success modal → invoice = one send; invoice refresh = one send;
 *   - store+order keyed → cross-store collision impossible; different orders fire;
 *   - TTL / entry cap stay bounded (expiry + eviction).
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import os from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require.resolve('esbuild/bin/esbuild');
const src = join(__dirname, '..', '..', '..', 'resources', 'js', 'tracking', 'dedup.ts');
const out = join(os.tmpdir(), 'wusool-dedup-test.cjs');

// Build the pure module to CommonJS for direct require().
execFileSync(process.execPath, [
  esbuild,
  src,
  '--bundle',
  '--platform=node',
  '--format=cjs',
  `--outfile=${out}`,
]);

const {
  dedupKey,
  beginPurchase,
  markPurchaseSent,
  clearPurchasePending,
  PURCHASE_DEDUP_MAX_ENTRIES,
  PURCHASE_PENDING_TTL_MS,
  PURCHASE_SENT_TTL_MS,
} = require(out);

const STORAGE_KEY = 'wusool_tracking_purchases';

class MemoryStorage {
  constructor() {
    this.data = new Map();
  }
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    this.data.set(key, String(value));
  }
}

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

console.log('Social Commerce — purchase dedup state machine tests\n');

// 1. Successful purchase => SENT; second invocation blocked.
{
  const storage = new MemoryStorage();
  const key = dedupKey('store-a', 'ORDER-1');
  const t0 = Date.now();
  assert(beginPurchase(storage, STORAGE_KEY, key, t0) === true, 'first begin claims the slot');
  markPurchaseSent(storage, STORAGE_KEY, key, t0 + 100);
  assert(beginPurchase(storage, STORAGE_KEY, key, t0 + 200) === false, 'sent order is blocked on retry');
  assert(beginPurchase(storage, STORAGE_KEY, key, t0 + 3000) === false, 'sent stays blocked');
}

// 2. Recent PENDING blocks concurrent invocation (second tab).
{
  const storage = new MemoryStorage();
  const key = dedupKey('store-a', 'ORDER-2');
  const t0 = Date.now();
  assert(beginPurchase(storage, STORAGE_KEY, key, t0) === true, 'first tab claims pending');
  assert(beginPurchase(storage, STORAGE_KEY, key, t0 + 50) === false, 'concurrent tab blocked by pending');
}

// 3. Failed payload fetch => PENDING cleared => retry allowed.
{
  const storage = new MemoryStorage();
  const key = dedupKey('store-a', 'ORDER-3');
  const t0 = Date.now();
  assert(beginPurchase(storage, STORAGE_KEY, key, t0) === true, 'claim pending');
  clearPurchasePending(storage, STORAGE_KEY, key, t0 + 50);
  assert(beginPurchase(storage, STORAGE_KEY, key, t0 + 60) === true, 'retry allowed after pending cleared');
}

// 4. Stale PENDING (TTL expired) allows retry.
{
  const storage = new MemoryStorage();
  const key = dedupKey('store-a', 'ORDER-4');
  const t0 = Date.now();
  beginPurchase(storage, STORAGE_KEY, key, t0);
  assert(beginPurchase(storage, STORAGE_KEY, key, t0 + PURCHASE_PENDING_TTL_MS + 1) === true, 'expired pending allows retry');
}

// 5. Success modal -> invoice => one send.
{
  const storage = new MemoryStorage();
  const key = dedupKey('store-a', 'ORDER-5');
  const t0 = Date.now();
  // Success modal begins+publishes.
  beginPurchase(storage, STORAGE_KEY, key, t0);
  markPurchaseSent(storage, STORAGE_KEY, key, t0 + 10);
  // Invoice (same session, maybe new tab shortly after) must be blocked.
  assert(beginPurchase(storage, STORAGE_KEY, key, t0 + 500) === false, 'invoice after success modal is blocked');
}

// 6. Invoice refresh => one send.
{
  const storage = new MemoryStorage();
  const key = dedupKey('store-a', 'ORDER-6');
  const t0 = Date.now();
  beginPurchase(storage, STORAGE_KEY, key, t0);
  markPurchaseSent(storage, STORAGE_KEY, key, t0 + 10);
  // Refresh much later (still within 30-day sent TTL).
  assert(beginPurchase(storage, STORAGE_KEY, key, t0 + PURCHASE_PENDING_TTL_MS + 5000) === false, 'invoice refresh blocked (sent)');
}

// 7. Same order number across different stores => independent.
{
  const storage = new MemoryStorage();
  const a = dedupKey('store-a', 'ORDER-7');
  const b = dedupKey('store-b', 'ORDER-7');
  const t0 = Date.now();
  assert(a !== b, 'store+order keys differ for equal order numbers');
  beginPurchase(storage, STORAGE_KEY, a, t0);
  markPurchaseSent(storage, STORAGE_KEY, a, t0 + 10);
  assert(beginPurchase(storage, STORAGE_KEY, b, t0 + 20) === true, 'store A sent does not block store B');
  markPurchaseSent(storage, STORAGE_KEY, b, t0 + 30);
  assert(beginPurchase(storage, STORAGE_KEY, b, t0 + 40) === false, 'store B now sent too');
}

// 8. Different orders => independent.
{
  const storage = new MemoryStorage();
  const a = dedupKey('store-a', 'ORDER-A1');
  const b = dedupKey('store-a', 'ORDER-B1');
  const t0 = Date.now();
  beginPurchase(storage, STORAGE_KEY, a, t0);
  markPurchaseSent(storage, STORAGE_KEY, a, t0 + 10);
  assert(beginPurchase(storage, STORAGE_KEY, b, t0 + 20) === true, 'different order (same store) fires independently');
}

// 9. Expired SENT (30-day TTL) allows a fresh attribution window.
{
  const storage = new MemoryStorage();
  const key = dedupKey('store-a', 'ORDER-9');
  const t0 = Date.now();
  beginPurchase(storage, STORAGE_KEY, key, t0);
  markPurchaseSent(storage, STORAGE_KEY, key, t0 + 10);
  assert(beginPurchase(storage, STORAGE_KEY, key, t0 + 10 + PURCHASE_SENT_TTL_MS + 1) === true, 'expired sent allows fresh window');
}

// 10. TTL pruning: expired SENT entries are removed on read.
{
  const storage = new MemoryStorage();
  const oldKey = dedupKey('store-a', 'OLD-ORDER');
  const newKey = dedupKey('store-b', 'NEW-ORDER');
  const t0 = Date.now();
  beginPurchase(storage, STORAGE_KEY, oldKey, t0);
  markPurchaseSent(storage, STORAGE_KEY, oldKey, t0 + 10);
  // New order marked far in the future (fresh sent within its window at read time).
  beginPurchase(storage, STORAGE_KEY, newKey, t0 + PURCHASE_SENT_TTL_MS + 1);
  markPurchaseSent(storage, STORAGE_KEY, newKey, t0 + PURCHASE_SENT_TTL_MS + 1);
  // A read well past the OLD order's sent TTL prunes it (beginPurchase prunes on read).
  beginPurchase(storage, STORAGE_KEY, newKey, t0 + 10 + PURCHASE_SENT_TTL_MS + 20);
  const raw = JSON.parse(storage.getItem(STORAGE_KEY));
  const liveKeys = Object.keys(raw);
  assert(!liveKeys.includes(oldKey), 'expired sent pruned from stored map');
  assert(liveKeys.includes(newKey), 'fresh sent retained after prune');
}

// 11. Entry cap evicts oldest first (bounded growth).
{
  const storage = new MemoryStorage();
  const t0 = Date.now();
  for (let i = 0; i < PURCHASE_DEDUP_MAX_ENTRIES + 50; i++) {
    beginPurchase(storage, STORAGE_KEY, dedupKey('store-cap', `ORDER-${i}`), t0 + i);
    markPurchaseSent(storage, STORAGE_KEY, dedupKey('store-cap', `ORDER-${i}`), t0 + i);
  }
  const map = JSON.parse(storage.getItem(STORAGE_KEY));
  const size = Object.keys(map).length;
  assert(size <= PURCHASE_DEDUP_MAX_ENTRIES, `capped at ${PURCHASE_DEDUP_MAX_ENTRIES} (was ${size})`);
  assert(!('store-cap:ORDER-0' in map), 'oldest entry evicted first');
}

// 12. Null storage (blocked localStorage) — best effort, never throws.
{
  assert(beginPurchase(null, STORAGE_KEY, dedupKey('store-a', 'ORDER-12')) === true, 'null storage allows proceed without throwing');
  markPurchaseSent(null, STORAGE_KEY, dedupKey('store-a', 'ORDER-12'));
  clearPurchasePending(null, STORAGE_KEY, dedupKey('store-a', 'ORDER-12'));
  assert(true, 'mark/clear on null storage do not throw');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);