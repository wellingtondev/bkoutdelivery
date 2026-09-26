const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/app/components/monthly-summary/monthly-summary.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api, Date, Intl });
const delivery = (overrides = {}) => ({ id: '1', status: 'DELIVERED', orderValue: 0.1, deliveryFee: 0.2, deliveredAt: '2026-10-01T02:59:59Z', ...overrides });

test('closing uses real completion in Sao Paulo, including UTC month boundary', () => {
  const data = [delivery({ shipmentDate: '2026-01-01' }), delivery({ id: '2', deliveredAt: '2026-10-01T03:00:00Z' })];
  const september = api.monthlyClosing(data, 2026, 8);
  assert.equal(september.count, 1);
  assert.equal(september.days[29].count, 1);
  assert.equal(api.monthlyClosing(data, 2026, 9).days[0].count, 1);
});

test('orders and fees are summed separately in integer cents', () => {
  const summary = api.monthlyClosing([delivery(), delivery({ orderValue: 0.2, deliveryFee: 0.1 }), delivery({ orderValue: 1.005, deliveryFee: 2.01 })], 2026, 8);
  assert.equal(summary.count, 3);
  assert.equal(summary.orderCents, 131);
  assert.equal(summary.feeCents, 231);
  assert.equal(summary.days[29].orderCents, 131);
});

test('pending deliveries excluded; absent or invalid legacy completion dates counted as missing', () => {
  const summary = api.monthlyClosing([
    delivery({ status: 'WAITING' }), delivery({ status: 'OUT_FOR_DELIVERY' }),
    delivery({ deliveredAt: undefined }), delivery({ deliveredAt: 'invalid' }),
    delivery({ deliveredAt: '2026-09-30' }), delivery({ deliveredAt: { toDate() { throw new Error('invalid'); } } })
  ], 2026, 8);
  assert.equal(summary.count, 0);
  assert.equal(summary.missingDates, 4);
});

test('supports Firestore seconds, toDate, Date and offset ISO completion values', () => {
  const timestamp = new Date('2026-09-30T13:00:00Z');
  const summary = api.monthlyClosing([
    delivery({ deliveredAt: { seconds: timestamp.getTime() / 1000, nanoseconds: 0 } }),
    delivery({ deliveredAt: { toDate: () => timestamp } }), delivery({ deliveredAt: timestamp }),
    delivery({ deliveredAt: '2026-09-30T10:00:00-03:00' })
  ], 2026, 8);
  assert.equal(summary.count, 4);
  assert.equal(summary.days[29].count, 4);
});

test('calendar respects leap years and first weekday', () => {
  const leap = api.monthlyClosing([], 2024, 1);
  assert.equal(leap.days.length, 29);
  assert.equal(leap.offset, 4);
  assert.equal(api.monthlyClosing([], 2025, 1).days.length, 28);
  assert.equal(api.monthlyClosing([], 2026, 11).days.at(-1).key, '2026-12-31');
});
