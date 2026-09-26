// Offline contract checks: no Firebase initialization, credentials, or network.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup() {
  const listeners = [];
  const batches = [];
  const additions = [];
  const records = new Map();
  let authCallback;
  let authStopped = false;
  let commitError;
  const authState = { currentUser: null };
  let id = 0;
  const signal = initial => {
    let value = initial;
    const read = () => value;
    read.set = next => { value = next; };
    read.update = update => { value = update(value); };
    read.asReadonly = () => read;
    return read;
  };
  const reference = (parent, ...segments) => {
    const refPath = [parent.path, ...segments].filter(Boolean).join('/');
    return { path: refPath, id: refPath.split('/').at(-1) };
  };
  const firestore = {
    runTransaction: async (_db, callback) => {
      const batch = { writes: [], committed: false };
      batches.push(batch);
      await callback({
        get: async ref => ({ exists: () => records.has(ref.path), data: () => records.get(ref.path) }),
        update: (ref, data) => batch.writes.push({ kind: 'update', ref, data })
      });
      if (commitError) throw commitError;
      for (const write of batch.writes) records.set(write.ref.path, { ...records.get(write.ref.path), ...write.data });
      batch.committed = true;
    },
    addDoc: async (ref, data) => {
      if (commitError) throw commitError;
      additions.push({ ref, data });
      return { id: 'new-shipment' };
    },
    collection: reference,
    doc: (parent, ...segments) => reference(parent, ...(segments.length ? segments : [`delivery-${++id}`])),
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    onSnapshot: (ref, next, error) => {
      const listener = { ref, next, error, stopped: false };
      listeners.push(listener);
      return () => { listener.stopped = true; };
    },
    writeBatch: () => {
      const batch = { writes: [], committed: false };
      batches.push(batch);
      const writer = {
        set: (ref, data) => { batch.writes.push({ kind: 'set', ref, data }); return writer; },
        update: (ref, data) => { batch.writes.push({ kind: 'update', ref, data }); return writer; },
        commit: async () => { if (commitError) throw commitError; batch.committed = true; }
      };
      return writer;
    }
  };
  const modules = {
    '@angular/core': { Injectable: () => target => target, signal },
    'firebase/auth': { onAuthStateChanged: (_auth, callback) => { authCallback = callback; return () => { authStopped = true; }; } },
    'firebase/firestore': firestore,
    'rxjs': require('rxjs'),
    './firebase': { auth: authState, db: {} }
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/app/core/delivery.service.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, require: name => { if (!(name in modules)) throw Error(`Unmocked import: ${name}`); return modules[name]; },
    crypto: { randomUUID: () => 'public-token' }, console
  }, { filename: 'delivery.service.js' });
  const service = new exports.DeliveryService();
  const active = refPath => listeners.findLast(listener => listener.ref.path === refPath && !listener.stopped);
  return {
    service, listeners, batches, additions, active,
    signIn: user => { authState.currentUser = user; authCallback(user); },
    get authStopped() { return authStopped; },
    failCommit: error => { commitError = error; },
    emitCollection: (refPath, rows) => {
      rows.forEach(row => records.set(refPath + '/' + row.id, row));
      active(refPath).next({ docs: rows.map(row => ({ id: row.id, data: () => row })) });
    },
    emitDocument: (refPath, data) => active(refPath).next({ exists: () => data !== undefined, data: () => data })
  };
}

const order = { shipmentId: 's1', customerName: 'Cliente', phone: '11999999999', address: 'Rua particular, 10', product: 'Pedido', orderValue: 25, deliveryFee: 5, paid: false, lat: -23.55, lng: -46.63 };

test('creates the first shipment with date, time and initial status', async () => {
  const h = setup();
  const id = await h.service.createShipment({ date: '2026-09-26', time: '18:00' });
  assert.equal(id, 'new-shipment');
  assert.equal(h.additions.length, 1);
  assert.equal(h.additions[0].ref.path, 'shipments');
  assert.equal(h.additions[0].data.date, '2026-09-26');
  assert.equal(h.additions[0].data.time, '18:00');
  assert.equal(h.additions[0].data.status, 'WAITING');
});

test('rejects missing or impossible shipment dates and times before writing', async () => {
  const h = setup();
  for (const input of [
    { date: '', time: '18:00' },
    { date: '2026-02-30', time: '18:00' },
    { date: '2026-09-26', time: '' },
    { date: '2026-09-26', time: '24:00' }
  ]) await assert.rejects(h.service.createShipment(input), /válidos/);
  assert.equal(h.additions.length, 0);
});

test('shipment creation propagates denied writes', async () => {
  const h = setup();
  h.failCommit(new Error('permission-denied'));
  await assert.rejects(h.service.createShipment({ date: '2026-09-26', time: '18:00' }), /permission-denied/);
  assert.equal(h.additions.length, 0);
});

test('loading ends on empty result and read errors remain distinguishable', () => {
  const h = setup();
  h.signIn({ uid: 'staff' });
  h.emitDocument('users/staff', { role: 'STORE', active: true });
  assert.equal(h.service.loading(), true);
  h.emitCollection('shipments', []);
  assert.equal(h.service.loading(), false);
  assert.equal(h.service.error(), '');
  h.active('shipments').error(new Error('permission-denied'));
  assert.equal(h.service.loading(), false);
  assert.match(h.service.error(), /remessas/);
});

function loadStaff(h) {
  h.signIn({ uid: 'staff' });
  h.emitDocument('users/staff', { role: 'STORE', active: true });
  h.emitCollection('shipments', [{ id: 's1', date: '2026-09-26', time: '20:00', status: 'WAITING' }]);
}

test('TEST-04 / REQ-02: add atomically creates private delivery and a public tracking record without contact data', async () => {
  const h = setup();
  loadStaff(h);
  await h.service.add(order);
  assert.equal(h.batches.length, 1);
  const batch = h.batches[0];
  assert.equal(batch.committed, true);
  assert.equal(batch.writes.length, 2);
  const privateWrite = batch.writes.find(write => write.ref.path.startsWith('shipments/s1/deliveries/'));
  const publicWrite = batch.writes.find(write => write.ref.path.startsWith('tracking/'));
  assert.ok(privateWrite);
  assert.ok(publicWrite);
  assert.equal(privateWrite.data.phone, order.phone);
  assert.equal(privateWrite.data.address, order.address);
  assert.equal(publicWrite.data.status, 'WAITING');
  assert.equal(publicWrite.data.orderValue, 25);
  assert.equal(publicWrite.data.paid, false);
  assert.equal('phone' in publicWrite.data, false);
  assert.equal('address' in publicWrite.data, false);
  assert.equal(publicWrite.data.deliveryId, privateWrite.ref.id);
  assert.equal(privateWrite.data.trackingToken, publicWrite.ref.id);
  assert.equal(publicWrite.data.destination.lat, order.lat);
  assert.equal(publicWrite.data.destination.lng, order.lng);
  assert.equal(publicWrite.data.trackingActive, false);
});

test('a new delivery requires a confirmed destination before persisting', async () => {
  const h = setup();
  loadStaff(h);
  await assert.rejects(h.service.add({ ...order, lat: undefined, lng: undefined }), /destino/);
  await assert.rejects(h.service.add({ ...order, lat: 91 }), /destino/);
  await assert.rejects(h.service.add({ ...order, address: ' ' }), /endereço/);
  assert.equal(h.batches.length, 0);
});

test('TEST-05 / REQ-02: failed writes reject so callers can report failure', async () => {
  const h = setup();
  loadStaff(h);
  h.failCommit(new Error('permission-denied'));
  await assert.rejects(h.service.add(order), /permission-denied/);
  assert.equal(h.batches[0].committed, false);
});

test('TEST-05 / REQ-02: confirm updates private and public status together', async () => {
  const h = setup();
  loadStaff(h);
  h.emitCollection('shipments/s1/deliveries', [{ ...order, id: 'd1', trackingToken: 'token1', status: 'WAITING' }]);
  await h.service.confirm('d1');
  assert.equal(h.batches.length, 1);
  assert.equal(h.batches[0].committed, true);
  assert.deepEqual(h.batches[0].writes.map(write => write.ref.path).sort(), ['shipments/s1/deliveries/d1', 'tracking/token1']);
  for (const write of h.batches[0].writes) {
    assert.equal(write.kind, 'update');
    assert.equal(write.data.status, 'DELIVERED');
    assert.equal(write.data.deliveredAt, 'SERVER_TIMESTAMP');
  }
});

test('TEST-05 / REQ-02: missing delivery or shipment rejects without writing', async () => {
  const h = setup();
  await assert.rejects(h.service.add(order), /remessa/);
  await assert.rejects(h.service.confirm('missing'), /encontrada/);
  assert.equal(h.batches.length, 0);
});

test('TEST-06 / REQ-02: anonymous tracking subscribes only to public record, updates, and unsubscribes', () => {
  const h = setup();
  h.signIn(null);
  const values = [];
  const subscription = h.service.byToken('token1').subscribe(value => values.push(value));
  assert.deepEqual(h.listeners.map(listener => listener.ref.path), ['tracking/token1']);
  h.emitDocument('tracking/token1', { customerName: 'Cliente', product: 'Pedido', status: 'WAITING' });
  assert.equal(values[0].orderValue, 0);
  assert.equal(values[0].paid, false);
  h.emitDocument('tracking/token1', { status: 'DELIVERED', orderValue: 25, paid: true });
  assert.equal(values[1].status, 'DELIVERED');
  h.emitDocument('tracking/token1', undefined);
  assert.equal(values[2], undefined);
  subscription.unsubscribe();
  assert.equal(h.listeners[0].stopped, true);
});

test('TEST-06 / REQ-02: malformed tracking token does not create a listener', () => {
  const h = setup();
  const values = [];
  h.service.byToken('invalid/path').subscribe(value => values.push(value));
  assert.deepEqual(values, [undefined]);
  assert.equal(h.listeners.length, 0);
});

test('TEST-07 / REQ-02: logout clears private signals and cancels all staff listeners', () => {
  const h = setup();
  loadStaff(h);
  h.emitCollection('shipments/s1/deliveries', [{ ...order, id: 'd1', trackingCode: 'legacy-token', status: 'WAITING' }]);
  assert.equal(h.service.deliveries()[0].trackingToken, 'legacy-token');
  h.signIn(null);
  assert.equal(h.service.shipments().length, 0);
  assert.equal(h.service.deliveries().length, 0);
  assert.ok(h.listeners.every(listener => listener.stopped));
  h.service.ngOnDestroy();
  assert.equal(h.authStopped, true);
});

test('TEST-07 / REQ-02: inactive profile never subscribes to private shipments', () => {
  const h = setup();
  h.signIn({ uid: 'staff' });
  h.emitDocument('users/staff', { role: 'STORE', active: false });
  assert.deepEqual(h.listeners.map(listener => listener.ref.path), ['users/staff']);
  assert.equal(h.service.shipments().length, 0);
});

test('TEST-07 / REQ-02: profile revocation clears previously loaded private data', () => {
  const h = setup();
  loadStaff(h);
  h.emitCollection('shipments/s1/deliveries', [{ ...order, id: 'd1' }]);
  h.emitDocument('users/staff', { role: 'STORE', active: false });
  assert.equal(h.service.shipments().length, 0);
  assert.equal(h.service.deliveries().length, 0);
  assert.ok(h.listeners.filter(listener => listener.ref.path !== 'users/staff').every(listener => listener.stopped));
});

test('TEST-07 / REQ-02: removing a shipment removes its deliveries and listener', () => {
  const h = setup();
  loadStaff(h);
  h.emitCollection('shipments/s1/deliveries', [{ ...order, id: 'd1' }]);
  h.emitCollection('shipments', []);
  assert.equal(h.service.deliveries().length, 0);
  assert.equal(h.active('shipments/s1/deliveries'), undefined);
});

test('TEST-05 / REQ-02: confirmation failure propagates and does not optimistically mark delivery complete', async () => {
  const h = setup();
  loadStaff(h);
  h.emitCollection('shipments/s1/deliveries', [{ ...order, id: 'd1', trackingToken: 'token1', status: 'WAITING' }]);
  h.failCommit(new Error('permission-denied'));
  await assert.rejects(h.service.confirm('d1'), /permission-denied/);
  assert.equal(h.service.deliveries()[0].status, 'WAITING');
  assert.equal(h.batches[0].committed, false);
});

test('monthly closing: repeated confirmation from a stale client preserves the original completion date', async () => {
  const h = setup();
  loadStaff(h);
  h.emitCollection('shipments/s1/deliveries', [{ ...order, id: 'd1', trackingToken: 'token1', status: 'OUT_FOR_DELIVERY' }]);
  await h.service.confirm('d1');
  // Do not emit another snapshot: this client's cached delivery is deliberately stale.
  assert.equal(h.service.deliveries()[0].status, 'OUT_FOR_DELIVERY');
  await h.service.confirm('d1');
  assert.equal(h.batches.length, 2);
  assert.equal(h.batches[0].writes.length, 2);
  assert.equal(h.batches[1].writes.length, 0);
});

test('driver history: confirming without GPS assigns the authenticated driver only on the private record', async () => {
  const h = setup(); loadStaff(h);
  h.emitCollection('shipments/s1/deliveries', [{ ...order, id: 'd1', trackingToken: 'token1', status: 'WAITING' }]);
  await h.service.confirm('d1');
  const writes = h.batches[0].writes;
  assert.equal(writes.find(write => write.ref.path.startsWith('shipments/')).data.driverId, 'staff');
  assert.equal('driverId' in writes.find(write => write.ref.path.startsWith('tracking/')).data, false);
});

test('driver history: another driver cannot confirm and take credit for an assigned delivery', async () => {
  const h = setup(); loadStaff(h);
  h.emitCollection('shipments/s1/deliveries', [{ ...order, id: 'd1', trackingToken: 'token1', status: 'OUT_FOR_DELIVERY', driverId: 'other-driver' }]);
  await assert.rejects(h.service.confirm('d1'), /outro entregador/);
  assert.equal(h.batches[0].writes.length, 0);
});

test('monthly closing: an already delivered record is never dated again, including legacy missing dates', async () => {
  for (const deliveredAt of ['2026-08-31T23:59:00-03:00', undefined]) {
    const h = setup(); loadStaff(h);
    h.emitCollection('shipments/s1/deliveries', [{ ...order, id: 'd1', trackingToken: 'token1', status: 'DELIVERED', deliveredAt }]);
    await h.service.confirm('d1');
    assert.equal(h.batches[0].writes.length, 0);
  }
});
