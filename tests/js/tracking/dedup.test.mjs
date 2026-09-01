/**
 * Unit tests for resources/js/tracking/dedup.ts — the pure (framework-free,
 * window-free) Social Commerce purchase-dedup algorithm.
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
 *   - one logical order fires at most once per browser/profile;
 *   - dedup is keyed by store + order (different stores with the same order
 *     number NEVER collide; different orders always fire independently);
 *   - entries are bounded (TTL expiry + max entry cap).
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
// Build artifact goes to the OS temp dir so it is never committed to the repo.
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
  hasPurchaseFired,
  markPurchaseFired,
  PURCHASE_DEDUP_MAX_ENTRIES,
  PURCHASE_DEDUP_TTL_MS,
} = require(out);

const TTL_DAY_MS = 24 * 60 * 60 * 1000;

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

console.log('Social Commerce — purchase dedup unit tests\n');

// 1. Fire -> refresh -> still one (same store same order, no duplicate).
{
  const storage = new MemoryStorage();
  const key = dedupKey('store-a', 'ORDER-1');
  assert(!hasPurchaseFired(storage, 'wusool_tracking_purchases', key), 'fresh order may fire');
  markPurchaseFired(storage, 'wusool_tracking_purchases', key, Date.now());
  assert(hasPurchaseFired(storage, 'wusool_tracking_purchases', key), 'same order after fire is blocked');
  assert(hasPurchaseFired(storage, 'wusool_tracking_purchases', key), 'second check stays blocked (idempotent)');
}

// 2. Two different orders fire independently (same store).
{
  const storage = new MemoryStorage();
  const a = dedupKey('store-a', 'ORDER-1');
  const b = dedupKey('store-a', 'ORDER-2');
  markPurchaseFired(storage, 'wusool_tracking_purchases', a, Date.now());
  assert(!hasPurchaseFired(storage, 'wusool_tracking_purchases', b), 'different order (same store) still fires');
}

// 3. Two stores sharing the same order number never collide.
{
  const storage = new MemoryStorage();
  const a = dedupKey('store-a', 'ORDER-1');
  const b = dedupKey('store-b', 'ORDER-1');
  assert(a !== b, 'store+order keys differ for equal order numbers');
  markPurchaseFired(storage, 'wusool_tracking_purchases', a, Date.now());
  assert(!hasPurchaseFired(storage, 'wusool_tracking_purchases', b), 'store A fire does not block store B');
  markPurchaseFired(storage, 'wusool_tracking_purchases', b, Date.now());
  assert(hasPurchaseFired(storage, 'wusool_tracking_purchases', b), 'store B now blocked too');
}

// 4. TTL: after the retention window an order may fire again (fresh window).
{
  const storage = new MemoryStorage();
  const key = dedupKey('store-a', 'ORDER-1');
  const t0 = Date.now();
  markPurchaseFired(storage, 'wusool_tracking_purchases', key, t0);
  assert(hasPurchaseFired(storage, 'wusool_tracking_purchases', key, t0 + TTL_DAY_MS), 'in-window is blocked');
  // Just after TTL expires the order becomes eligible again.
  assert(!hasPurchaseFired(storage, 'wusool_tracking_purchases', key, t0 + PURCHASE_DEDUP_TTL_MS + 1), 'post-TTL eligible again');
}

// 5. Bounded storage: expired entries are pruned on read.
{
  const storage = new MemoryStorage();
  const oldKey = dedupKey('store-a', 'OLD-ORDER');
  const newKey = dedupKey('store-b', 'NEW-ORDER');
  const t0 = Date.now();
  markPurchaseFired(storage, 'wusool_tracking_purchases', oldKey, t0);
  // Fresh order marked "now" so it is within the retention window at read time.
  markPurchaseFired(storage, 'wusool_tracking_purchases', newKey, t0 + PURCHASE_DEDUP_TTL_MS + 1);
  // Reading with a time well past TTL for the old order must prune it.
  hasPurchaseFired(storage, 'wusool_tracking_purchases', oldKey, t0 + PURCHASE_DEDUP_TTL_MS + 5);
  const raw = JSON.parse(storage.getItem('wusool_tracking_purchases'));
  assert(!(oldKey in raw), 'expired entry removed from stored map');
  assert(newKey in raw, 'fresh entry retained after prune');
}

// 6. Bounded storage: entry cap evicts oldest first.
{
  const storage = new MemoryStorage();
  const t0 = Date.now();
  for (let i = 0; i < PURCHASE_DEDUP_MAX_ENTRIES + 50; i++) {
    markPurchaseFired(storage, 'wusool_tracking_purchases', dedupKey('store-cap', `ORDER-${i}`), t0 + i);
  }
  const map = JSON.parse(storage.getItem('wusool_tracking_purchases'));
  const size = Object.keys(map).length;
  assert(size <= PURCHASE_DEDUP_MAX_ENTRIES, `capped at ${PURCHASE_DEDUP_MAX_ENTRIES} (was ${size})`);
  // The 50 oldest were dropped (they were inserted first with earliest t).
  assert(!('store-cap:ORDER-0' in map), 'oldest entry evicted first');
  assert('store-cap:ORDER-0' in map === false, 'oldest entry not retained');
}

// 7. Null storage (localStorage blocked) — best effort, never throws.
{
  assert(!hasPurchaseFired(null, 'wusool_tracking_purchases', dedupKey('store-a', 'ORDER-1')), 'null storage reports not-fired without throwing');
  markPurchaseFired(null, 'wusool_tracking_purchases', dedupKey('store-a', 'ORDER-1'));
  assert(true, 'marking on null storage does not throw');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);