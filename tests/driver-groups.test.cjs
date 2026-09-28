const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, Date, Intl, require: id => {
    if (!(id in dependencies)) throw Error(`Unexpected dependency: ${id}`);
    return dependencies[id];
  }});
  return exports;
}
const calendar = load('src/app/core/shipment-calendar.ts');
const { driverDayGroups } = load('src/app/pages/driver/driver-groups.ts', { '../../core/shipment-calendar': calendar });
const shipments = [{ id: 'legacy', date: '2026-09-26', time: '18:00' }, { id: 'slot-1800', date: '2026-09-28', time: '18:00' }];
test('recurring driver groups use delivery day, preserving overdue and future open jobs', () => {
  const jobs = ['2026-09-27', '2026-09-28', '2026-09-29'].map((deliveryDate, i) => ({ id: String(i), shipmentId: 'legacy', deliveryDate }));
  const groups = driverDayGroups(jobs, shipments);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].label, 'Remessa 27/09/2026 · 18:00');
  assert.equal(groups[1].label, 'Remessa 28/09/2026 · 18:00');
  assert.equal(groups[2].deliveries[0], jobs[2]);
});
test('same day and time aggregate legacy IDs without changing delivery order or duplicating jobs', () => {
  const jobs = [{ id: 'first', shipmentId: 'slot-1800', deliveryDate: '2026-09-28' }, { id: 'second', shipmentId: 'legacy', deliveryDate: '2026-09-28' }];
  const groups = driverDayGroups(jobs, shipments);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].deliveries.length, 2);
  assert.equal(groups[0].deliveries[0], jobs[0]);
  assert.equal(groups[0].deliveries[1], jobs[1]);
});
test('legacy creation date respects Sao Paulo and unknown dates do not masquerade as today', () => {
  const groups = driverDayGroups([{ id: 'old', shipmentId: 'legacy', createdAt: '2026-09-28T02:00:00Z' }, { id: 'unknown', shipmentId: 'missing' }], shipments);
  assert.equal(groups[0].label, 'Remessa 27/09/2026 · 18:00');
  assert.equal(groups[1].label, 'Remessa Data não informada');
});
