const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(relative, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, relative), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const api = {};
  vm.runInNewContext(compiled, { exports: api, Date, Intl, require: name => { if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`); return dependencies[name]; } });
  return api;
}
const dates = load('../src/app/components/monthly-summary/monthly-summary.ts');
const { driverHistory } = load('../src/app/components/driver-history/driver-history.ts', { '../monthly-summary/monthly-summary': dates });
const now = new Date('2026-10-01T13:00:00Z');
const delivery = (overrides = {}) => ({ id: 'one', driverId: 'driver-one', shipmentId: 'shipment-one', status: 'DELIVERED', deliveredAt: '2026-10-01T03:00:00Z', customerName: 'Ana', product: 'Pedido', ...overrides });

test('includes only authenticated driver completed deliveries, never legacy unassigned or other drivers', () => {
  const data = [delivery(), delivery({ driverId: 'driver-two' }), delivery({ driverId: undefined }), delivery({ status: 'WAITING' }), delivery({ status: 'OUT_FOR_DELIVERY' })];
  const result = driverHistory(data, [], 'driver-one', 2026, 9, now);
  assert.equal(result.todayCount, 1);
  assert.equal(result.monthCount, 1);
  assert.equal(result.days[0].groups[0].deliveries.length, 1);
  assert.equal(driverHistory(data, [], '', 2026, 9, now).monthCount, 0);
});

test('uses Sao Paulo completion date across UTC month boundary', () => {
  const result = driverHistory([delivery({ deliveredAt: '2026-10-01T02:59:59Z' }), delivery()], [], 'driver-one', 2026, 8, now);
  assert.equal(result.monthCount, 1);
  assert.equal(result.days[29].count, 1);
  assert.equal(result.todayCount, 1);
});

test('today count stays independent of selected month and day', () => {
  const data = [delivery(), delivery({ id: 'two', deliveredAt: '2026-09-15T15:00:00Z' }), delivery({ id: 'three', deliveredAt: '2026-09-16T15:00:00Z' })];
  const september = driverHistory(data, [], 'driver-one', 2026, 8, now);
  const august = driverHistory(data, [], 'driver-one', 2026, 7, now);
  assert.equal(september.monthCount, 2);
  assert.equal(september.todayCount, 1);
  assert.equal(august.monthCount, 0);
  assert.equal(august.todayCount, 1);
});

test('groups by shipment ID, preserving different shipments with identical date/time', () => {
  const shipments = [{ id: 'shipment-one', date: '2026-09-30', time: '20:00' }, { id: 'shipment-two', date: '2026-09-30', time: '20:00' }];
  const result = driverHistory([delivery(), delivery({ id: 'two' }), delivery({ id: 'three', shipmentId: 'shipment-two' }), delivery({ id: 'four', shipmentId: '<missing>' })], shipments, 'driver-one', 2026, 9, now);
  const groups = result.days[0].groups;
  assert.equal(groups.length, 3);
  assert.equal(groups[0].deliveries.length, 2);
  assert.equal(groups[1].deliveries.length, 1);
  assert.equal(groups[0].shipment, shipments[0]);
  assert.equal(groups[1].shipment, shipments[1]);
  assert.equal(groups[2].shipment, undefined);
  assert.equal(groups[2].shipmentId, '<missing>');
});

test('missing date warning counts only own completed deliveries; no inferred shipment date', () => {
  const result = driverHistory([
    delivery({ deliveredAt: undefined }), delivery({ deliveredAt: 'invalid' }),
    delivery({ deliveredAt: undefined, driverId: 'driver-two' }), delivery({ deliveredAt: undefined, driverId: undefined }),
    delivery({ deliveredAt: undefined, status: 'WAITING' })
  ], [{ id: 'shipment-one', date: '2026-10-01', time: '10:00' }], 'driver-one', 2026, 9, now);
  assert.equal(result.missingDates, 2);
  assert.equal(result.monthCount, 0);
  assert.equal(result.todayCount, 0);
});

test('empty calendar includes leap day and correct Sunday-based offset', () => {
  const result = driverHistory([], [], 'driver-one', 2024, 1, now);
  assert.equal(result.days.length, 29);
  assert.equal(result.offset, 4);
  assert.equal(result.days[28].key, '2024-02-29');
  assert.equal(result.days[28].count, 0);
  assert.equal(result.days[28].groups.length, 0);
});
