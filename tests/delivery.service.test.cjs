// Offline contract checks: no Firebase initialization, credentials, or network.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const zones = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/core/delivery-zones.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: zones });
const calendar = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/core/shipment-calendar.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: calendar, Date });
const route = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/core/delivery-route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: route });
const payment = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/core/payment.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: payment });

function setup() {
  const listeners = [];
  const batches = [];
  const additions = [];
  const records = new Map();
  let authCallback;
  let authStopped = false;
  let commitError;
  let readError;
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
    getDoc: async ref => { if(readError)throw readError; return {exists:()=>records.has(ref.path),data:()=>records.get(ref.path)}; },
    runTransaction: async (_db, callback) => {
      const batch = { writes: [], committed: false };
      batches.push(batch);
      await callback({
        get: async ref => { assert.equal(batch.writes.length, 0, 'transaction reads must precede writes'); return { exists: () => records.has(ref.path), data: () => records.get(ref.path) }; },
        delete: ref => batch.writes.push({ kind: 'delete', ref }),
        set: (ref, data) => batch.writes.push({ kind: 'set', ref, data }),
        update: (ref, data) => batch.writes.push({ kind: 'update', ref, data })
      });
      if (commitError) throw commitError;
      for (const write of batch.writes) { if(write.kind==='delete') records.delete(write.ref.path); else records.set(write.ref.path, { ...records.get(write.ref.path), ...write.data }); }
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
    './firebase': { auth: authState, db: {} },
    './delivery-zones': zones, './shipment-calendar': calendar, './payment': payment, './delivery-route': route
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
    service, listeners, batches, additions, active, records,
    signIn: user => { authState.currentUser = user; authCallback(user); },
    get authStopped() { return authStopped; },
    failCommit: error => { commitError = error; },
    failRead: error => { readError = error; },
    emitCollection: (refPath, rows) => {
      rows.forEach(row => records.set(refPath + '/' + row.id, row));
      active(refPath).next({ docs: rows.map(row => ({ id: row.id, data: () => row })) });
    },
    emitDocument: (refPath, data) => active(refPath).next({ exists: () => data !== undefined, data: () => data })
  };
}

const order = { shipmentId: 's1', customerName: 'Cliente', phone: '11999999999', address: 'Rua particular, 10', product: 'Pedido', orderValue: 25, deliveryFee: 5, paid: false, paymentMethod: 'PIX', lat: -23.55, lng: -46.63 };

test('zones creation recalculates configured fee and blocks invalid settings instead of fallback',async()=>{
 const h=setup(), square=(a,b)=>[{lat:a,lng:a},{lat:a,lng:b},{lat:b,lng:b},{lat:b,lng:a}];
 h.records.set('settings/deliveryZones',{schemaVersion:1,green:square(1,2),yellow:square(0,3)});
 for(const [lat,expected] of [[1.5,10],[2.5,12],[4,15]]){
 await h.service.createDelivery('s1',{...order,lat,lng:lat,deliveryFee:999});
 assert.equal(h.batches.at(-1).writes[0].data.deliveryFee,expected);
 }
 h.records.set('settings/deliveryZones',{schemaVersion:2});
 await assert.rejects(h.service.createDelivery('s1',order),/zonas/i);assert.equal(h.batches.length,3);
});

test('zones read failure blocks delivery creation without manual fallback',async()=>{
 const h=setup();h.failRead(new Error('permission-denied'));
 await assert.rejects(h.service.createDelivery('s1',order),/permission-denied/);
 assert.equal(h.batches.length,0);
});

test('billing and notes persist privately; paid orders omit stale billing', async () => {
  for (const paid of [false, true]) {
    const h = setup();
    await h.service.createDelivery('s1', { ...order, paid, paymentMethod: 'CREDIT', installments: 2, notes: 'Portão azul' });
    const [privateWrite, publicWrite] = h.batches[0].writes;
    assert.equal(privateWrite.data.notes, 'Portão azul');
    assert.equal(privateWrite.data.paymentMethod, paid ? undefined : 'CREDIT');
    assert.equal(privateWrite.data.installments, paid ? undefined : 2);
    for (const key of ['notes', 'paymentMethod', 'installments', 'phone', 'address']) assert.equal(key in publicWrite.data, false);
  }
});

test('invalid billing fails before writing any delivery or tracking', async () => {
  const h = setup();
  await assert.rejects(h.service.createDelivery('s1', { ...order, paymentMethod: undefined }), /pagamento/);
  assert.equal(h.batches.length, 0);
});

test('creates the first recurring shipment transactionally with deterministic time ID', async () => {
  const h = setup();
  const id = await h.service.createShipment({ date: '2026-09-26', time: '18:00' });
  assert.equal(id, 'slot-1800');
  assert.equal(h.records.get('shipments/slot-1800').date, '2026-09-26');
  assert.equal(h.records.get('shipments/slot-1800').time, '18:00');
  assert.equal(h.records.get('shipments/slot-1800').status, 'WAITING');
});

test('daily shipments: reuse existing time across dates and transaction never overwrites existing slot',async()=>{
 const h=setup(); h.service.shipments.set([{id:'legacy',time:'18:00',date:'2026-09-20'}]);
 assert.equal(await h.service.createShipment({date:'2026-09-28',time:'18:00'}),'legacy');
 assert.equal(h.batches.length,0);
 h.service.shipments.set([]); h.records.set('shipments/slot-1800',{time:'18:00',date:'2026-09-20',status:'FINISHED'});
 assert.equal(await h.service.createShipment({date:'2026-09-28',time:'18:00'}),'slot-1800');
 assert.equal(h.records.get('shipments/slot-1800').date,'2026-09-20');
 assert.equal(h.batches[0].writes.length,0);
});

test('daily shipments: persist selected delivery date and reject impossible explicit dates',async()=>{
 const h=setup();
 await h.service.createDelivery('s1',{...order,deliveryDate:'2026-09-28'});
 assert.equal(h.batches[0].writes[0].data.deliveryDate,'2026-09-28');
 await assert.rejects(h.service.createDelivery('s1',{...order,deliveryDate:'2026-02-30'}),/data/);
 await assert.rejects(h.service.createDelivery('s1',{...order,deliveryDate:''}),/data/);
 assert.equal(h.batches.length,1);
});

test('daily shipments: legacy callers without date default to current Sao Paulo day',async()=>{
 const h=setup(); await h.service.createDelivery('s1',order);
 assert.equal(h.batches[0].writes[0].data.deliveryDate,calendar.saoPauloDay());
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

function routeFixture() {
  const h = setup(); loadStaff(h);
  h.emitCollection('shipments', [{ id: 's1' }, { id: 's2' }]);
  h.emitCollection('shipments/s1/deliveries', [{ ...order, id: 'd1', trackingToken: 't1', status: 'WAITING' }]);
  h.emitCollection('shipments/s2/deliveries', [{ ...order, shipmentId: 's2', id: 'd2', trackingToken: 't2', status: 'WAITING' }]);
  return h;
}

test('REQ-04 route: orders across shipments atomically and publishes positions only', async () => {
  const h = routeFixture();
  await h.service.saveRoute(['d2', 'd1']);
  assert.equal(h.records.get('shipments/s2/deliveries/d2').routeOrder, 1);
  assert.equal(h.records.get('shipments/s1/deliveries/d1').routeOrder, 2);
  assert.equal(h.records.get('shipments/s1/deliveries/d1').driverId, 'staff');
  for (const write of h.batches[0].writes.filter(w => w.ref.path.startsWith('tracking/'))) {
    assert.deepEqual(Object.keys(write.data), ['routePosition']);
  }
});

test('REQ-04 route: duplicates, missing, completed and other owners never write', async () => {
  const h = routeFixture();
  await assert.rejects(h.service.saveRoute(['d1', 'd1']), /repetida/);
  await assert.rejects(h.service.saveRoute(['missing']), /encontrada/);
  await assert.rejects(h.service.saveRoute(Array.from({length:101}, (_,i)=>String(i))), /100/);
  h.records.get('shipments/s1/deliveries/d1').driverId = 'other';
  await assert.rejects(h.service.saveRoute(['d1']), /outro entregador/);
  h.records.get('shipments/s1/deliveries/d1').driverId = 'staff';
  h.records.get('shipments/s1/deliveries/d1').status = 'DELIVERED';
  await assert.rejects(h.service.saveRoute(['d1']), /concluída/);
  assert.ok(h.batches.every(b => !b.writes.length));
});

test('REQ-04 route: completion compacts current route and ignores stale completed peers', async () => {
  const h = routeFixture();
  await h.service.saveRoute(['d1', 'd2']);
  // Listener hasn't caught up with ownership/order yet, so replay actual private snapshots.
  h.emitCollection('shipments/s1/deliveries', [h.records.get('shipments/s1/deliveries/d1')]);
  h.emitCollection('shipments/s2/deliveries', [h.records.get('shipments/s2/deliveries/d2')]);
  await h.service.confirm('d1');
  assert.equal(h.records.get('tracking/t1').routePosition, null);
  assert.equal(h.records.get('tracking/t2').routePosition, 1);
  assert.equal(h.records.get('shipments/s2/deliveries/d2').routeOrder, 1);
  await h.service.confirm('d2');
  assert.equal(h.records.get('tracking/t2').routePosition, null);
});

test('REQ-04 route: current manifest retains another device route entries absent from local listeners', async () => {
  const h = routeFixture();
  h.records.set('driverLocations/staff', { routeEntries: [{ id: 'remote', shipmentId: 'remote-shipment', trackingToken: 'remote-token' }] });
  h.records.set('shipments/remote-shipment/deliveries/remote', { status: 'WAITING', driverId: 'staff' });
  await h.service.saveRoute(['d1']);
  assert.equal(h.records.get('tracking/remote-token').routePosition, 2);
  await h.service.confirm('d1');
  assert.equal(h.records.get('tracking/remote-token').routePosition, 1);
  assert.equal(h.records.get('driverLocations/staff').routeEntries.length, 1);
});

test('REQ-04 route: completed peer in stale manifest does not prevent confirmation', async () => {
  const h = routeFixture();
  await h.service.saveRoute(['d1', 'd2']);
  h.records.get('shipments/s2/deliveries/d2').status = 'DELIVERED';
  await h.service.confirm('d1');
  assert.equal(h.records.get('shipments/s1/deliveries/d1').status, 'DELIVERED');
  assert.equal(h.records.get('driverLocations/staff').routeEntries.length, 0);
});

test('REQ-04 route: denied transaction and signed-out actions do not mutate route', async () => {
  const h = routeFixture();
  h.failCommit(new Error('permission-denied'));
  await assert.rejects(h.service.saveRoute(['d1', 'd2']), /permission-denied/);
  assert.equal(h.records.get('shipments/s1/deliveries/d1').driverId, undefined);
  assert.equal(h.records.has('driverLocations/staff'), false);
  h.signIn(null);
  await assert.rejects(h.service.saveRoute(['d1']), /Entre novamente/);
});

test('REQ-04 manual ETA: persists explicit future estimate privately and publicly, preserves absent and clears blank', async () => {
  const h = routeFixture();
  const eta = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await h.service.saveRoute(['d1'], { d1: eta });
  assert.equal(h.records.get('shipments/s1/deliveries/d1').estimatedArrival, eta);
  assert.equal(h.records.get('tracking/t1').estimatedArrival, eta);
  await h.service.saveRoute(['d1']);
  assert.equal(h.records.get('tracking/t1').estimatedArrival, eta);
  await h.service.saveRoute(['d1'], { d1: null });
  assert.equal(h.records.get('tracking/t1').estimatedArrival, null);
  await h.service.saveRoute(['d1'], { d1: eta });
  await h.service.confirm('d1');
  assert.equal(h.records.get('tracking/t1').estimatedArrival, null);
  assert.equal(h.records.get('shipments/s1/deliveries/d1').estimatedArrival, null);
});

test('REQ-04 manual ETA: rejects invalid, ambiguous, past, distant or unrelated estimates before writes', async () => {
  const h = routeFixture();
  for (const value of ['invalid', '2026-12-01T10:00', new Date(Date.now() - 1000).toISOString(), new Date(Date.now() + 8 * 86400000).toISOString()]) {
    await assert.rejects(h.service.saveRoute(['d1'], { d1: value }), /previsão/);
  }
  await assert.rejects(h.service.saveRoute(['d1'], { unknown: null }), /previsão/);
  assert.equal(h.batches.length, 0);
});


test('automatic route rejects a destination changed after calculation', async () => {
 const h=routeFixture();
 const eta=new Date(Date.now()+3600000).toISOString();
 await assert.rejects(h.service.saveRoute(['d1'],{d1:eta},{d1:{lat:0,lng:0}}),/destino mudou/);
 assert.equal(h.records.has('driverLocations/staff'),false);
});
test('automatic route clears estimates for remote stops outside calculated sequence', async () => {
 const h=routeFixture();
 h.records.set('driverLocations/staff',{routeEntries:[{id:'remote',shipmentId:'remote-shipment',trackingToken:'remote-token'}]});
 h.records.set('shipments/remote-shipment/deliveries/remote',{status:'WAITING',driverId:'staff'});
 h.records.set('tracking/remote-token',{estimatedArrival:new Date(Date.now()+3600000).toISOString()});
 const current=h.records.get('shipments/s1/deliveries/d1');
 await h.service.saveRoute(['d1'],{d1:new Date(Date.now()+3600000).toISOString()},{d1:{lat:current.lat,lng:current.lng}});
 assert.equal(h.records.get('tracking/remote-token').estimatedArrival,null);
});

test('store marks paid atomically without changing delivery status or closure date', async()=>{
 const h=routeFixture();h.records.set('users/staff',{role:'STORE',active:true});
 h.records.set('tracking/t1',{paid:false});
 const old=h.records.get('shipments/s1/deliveries/d1');
 await h.service.manageDelivery('s1','d1','paid');
 assert.equal(h.records.get('tracking/t1').paid,true);
 assert.equal(h.records.get('shipments/s1/deliveries/d1').paid,true);
 assert.equal(h.records.get('shipments/s1/deliveries/d1').status,old.status);
 assert.equal(h.records.get('shipments/s1/deliveries/d1').deliveredAt,old.deliveredAt);
});
test('store deletion removes tracking, compacts route and clears outdated estimates',async()=>{
 const h=routeFixture();h.records.set('users/staff',{role:'STORE'});
 await h.service.saveRoute(['d1','d2']);
 h.records.set('tracking/t2',{routePosition:2,estimatedArrival:'old'});
 await h.service.manageDelivery('s1','d1','delete');
 assert.equal(h.records.has('shipments/s1/deliveries/d1'),false);
 assert.equal(h.records.has('tracking/t1'),false);
 assert.equal(h.records.get('tracking/t2').routePosition,1);
 assert.equal(h.records.get('tracking/t2').estimatedArrival,null);
 assert.equal(h.records.get('driverLocations/staff').routeEntries.length,1);
});
test('management rejects driver, inactive store, missing delivery and denied commit',async()=>{
 const h=routeFixture();
 for(const profile of [{role:'DRIVER'},{role:'STORE',active:false}]){
 h.records.set('users/staff',profile);
 await assert.rejects(h.service.manageDelivery('s1','d1','delete'),/Somente a loja/);
 }
 h.records.set('users/staff',{role:'STORE'});
 await assert.rejects(h.service.manageDelivery('s1','missing','paid'),/não existe/);
 h.failCommit(new Error('permission-denied'));
 await assert.rejects(h.service.manageDelivery('s1','d1','delete'),/permission-denied/);
 assert.equal(h.records.has('shipments/s1/deliveries/d1'),true);
});
test('store can remove legacy delivery without tracking or route',async()=>{
 const h=routeFixture();h.records.set('users/staff',{role:'STORE'});
 h.records.set('shipments/s1/deliveries/legacy',{paid:false});
 await h.service.manageDelivery('s1','legacy','delete');
 assert.equal(h.records.has('shipments/s1/deliveries/legacy'),false);
});


