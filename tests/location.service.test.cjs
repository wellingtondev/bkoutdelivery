// Offline GPS contract tests: no browser permissions, Firebase credentials, or network.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const delivery = { id: 'd1', shipmentId: 's1', trackingToken: 't1' };
const privatePath = 'shipments/s1/deliveries/d1';
function setup() {
  const records = new Map([[privatePath, { status: 'WAITING' }], ['tracking/t1', { status: 'WAITING' }]]);
  const writes = [], watches = [], cleared = [];
  const auth = { currentUser: { uid: 'driver1' } };
  let authCallback, authStopped = false, beforeTransaction;
  const signal = initial => { let value = initial; const read = () => value; read.set = next => { value = next; }; return read; };
  const modules = {
    '@angular/core': { Injectable: () => target => target, signal },
    'firebase/auth': { onAuthStateChanged: (_auth, cb) => { authCallback = cb; return () => { authStopped = true; }; } },
    './firebase': { auth, db: {} },
    'firebase/firestore': {
      doc: (_db, ...parts) => ({ path: parts.join('/') }),
      serverTimestamp: () => 'SERVER_TIMESTAMP',
      runTransaction: async (_db, callback) => {
        if (beforeTransaction) { const hook = beforeTransaction; beforeTransaction = undefined; await hook(); }
        const pending = [];
        await callback({
          get: async ref => ({ data: () => records.get(ref.path) }),
          update: (ref, data) => pending.push({ path: ref.path, data })
        });
        for (const write of pending) { records.set(write.path, { ...records.get(write.path), ...write.data }); writes.push(write); }
      }
    }
  };
  const geolocation = {
    watchPosition: (next, error, options) => { watches.push({ next, error, options }); return watches.length; },
    clearWatch: id => cleared.push(id)
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/app/core/location.service.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, navigator: { geolocation }, require: name => {
    if (!(name in modules)) throw Error(`Unmocked import: ${name}`); return modules[name];
  }, console }, { filename: 'location.service.js' });
  const service = new exports.LocationService();
  return { service, records, writes, watches, cleared, auth,
    signIn(user) { auth.currentUser = user; authCallback(user); },
    position(index = watches.length - 1) { watches[index].next({ coords: { latitude: -23.55, longitude: -46.63, accuracy: 8 } }); },
    flush: () => new Promise(resolve => setImmediate(resolve)),
    beforeTransaction(hook) { beforeTransaction = hook; },
    get authStopped() { return authStopped; }
  };
}

test('GPS start atomically claims delivery and exposes in-route status without inventing a position', async () => {
  const h = setup(); await h.service.start(delivery);
  assert.equal(h.records.get(privatePath).driverId, 'driver1');
  assert.equal(h.records.get(privatePath).status, 'OUT_FOR_DELIVERY');
  assert.equal(h.records.get('tracking/t1').status, 'OUT_FOR_DELIVERY');
  assert.equal(h.records.get('tracking/t1').trackingActive, false);
  assert.equal(h.records.get('tracking/t1').driverLocation, null);
  assert.equal(h.service.activeDeliveryId(), 'd1');
  assert.equal(h.watches[0].options.enableHighAccuracy, true);
  h.position(); await h.flush();
  assert.equal(h.records.get('tracking/t1').trackingActive, true);
  assert.equal(h.records.get('tracking/t1').driverLocation.lat, -23.55);
});

test('GPS start rejects completed, missing, or differently assigned deliveries', async () => {
  for (const record of [undefined, { status: 'DELIVERED' }, { status: 'WAITING', driverId: 'other' }]) {
    const h = setup(); h.records.set(privatePath, record); await h.service.start(delivery);
    assert.equal(h.watches.length, 0); assert.equal(h.writes.length, 0);
    assert.ok(h.service.error()); assert.equal(h.service.starting(), false);
  }
});

test('GPS callbacks reject completed or reassigned delivery and cannot restore location after confirmation', async () => {
  for (const record of [{ status: 'DELIVERED', driverId: 'driver1' }, { status: 'OUT_FOR_DELIVERY', driverId: 'other' }]) {
    const h = setup(); await h.service.start(delivery);
    h.records.set(privatePath, record);
    h.position(); await h.flush();
    assert.equal(h.records.get('tracking/t1').driverLocation, null);
    assert.equal(h.records.get('tracking/t1').trackingActive, false);
    assert.ok(h.service.error());
  }
});

test('stop cancels browser watch, clears public location and ignores stale callbacks', async () => {
  const h = setup(); await h.service.start(delivery); h.position(); await h.flush();
  await h.service.stop(); const count = h.writes.length;
  assert.deepEqual(h.cleared, [1]); assert.equal(h.service.activeDeliveryId(), null);
  assert.equal(h.records.get('tracking/t1').driverLocation, null);
  assert.equal(h.records.get('tracking/t1').trackingActive, false);
  h.position(); await h.flush(); assert.equal(h.writes.length, count);
});

test('logout cancels existing watch and suppresses callbacks; destroy removes auth observer', async () => {
  const h = setup(); await h.service.start(delivery);
  h.signIn(null); const count = h.writes.length; h.position(); await h.flush();
  assert.deepEqual(h.cleared, [1]); assert.equal(h.service.activeDeliveryId(), null);
  assert.equal(h.writes.length, count);
  h.service.ngOnDestroy(); assert.equal(h.authStopped, true);
});

test('GPS denial cancels sharing and keeps actionable feedback', async () => {
  const h = setup(); await h.service.start(delivery);
  h.watches[0].error({ code: 1 }); await h.flush();
  assert.equal(h.service.activeDeliveryId(), null); assert.match(h.service.error(), /Permita o GPS/);
  assert.equal(h.records.get('tracking/t1').trackingActive, false);
});

test('logout while start transaction is pending must not install a new GPS watch', async () => {
  const h = setup();
  h.beforeTransaction(async () => h.signIn(null));
  await h.service.start(delivery);
  assert.equal(h.watches.length, 0);
  assert.equal(h.service.activeDeliveryId(), null);
});

test('stop while start transaction is pending must not restart sharing', async () => {
  const h = setup();
  h.beforeTransaction(async () => h.service.stop());
  await h.service.start(delivery);
  assert.equal(h.watches.length, 0);
  assert.equal(h.service.activeDeliveryId(), null);
});

test('switching accounts while start is pending must not share prior driver location', async () => {
  const h = setup();
  h.beforeTransaction(async () => h.signIn({ uid: 'driver2' }));
  await h.service.start(delivery);
  assert.equal(h.watches.length, 0);
  assert.equal(h.service.activeDeliveryId(), null);
});
