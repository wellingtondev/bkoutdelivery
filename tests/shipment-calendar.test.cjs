const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'); const vm=require('node:vm'); const ts=require('typescript');
const calendar={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/core/shipment-calendar.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:calendar,Date});
test('daily shipments: one stable representative per time without deleting or mutating historical data',()=>{
 const rows=[{id:'z',time:'18:00',date:'2026-09-26'},{id:'a',time:'18:00',date:'2026-09-27'},{id:'b',time:'12:30',date:'2026-09-26'}];
 assert.equal(calendar.recurringShipments(rows).map(x=>x.id).join(','),'b,a');
 assert.equal(calendar.recurringShipments([...rows].reverse()).map(x=>x.id).join(','),'b,a');
 assert.equal(rows.length,3);
});
test('daily shipments: delivery day prioritizes explicit date then Sao Paulo creation then legacy shipment',()=>{
 const shipments=[{id:'s',date:'2026-09-20',time:'18:00'}];
 const d={shipmentId:'s',deliveryDate:'2026-09-28',createdAt:'2026-09-27T01:00:00Z',deliveredAt:'2026-09-30T12:00:00Z'};
 assert.equal(calendar.deliveryDay(d,shipments),'2026-09-28');
 assert.equal(calendar.deliveryDay({...d,deliveryDate:'2026-02-30'},shipments),'2026-09-26');
 assert.equal(calendar.deliveryDay({...d,deliveryDate:null,createdAt:null},shipments),'2026-09-20');
 assert.equal(calendar.deliveryDay({shipmentId:'missing',deliveredAt:d.deliveredAt},shipments),null);
 assert.equal(calendar.deliveryDay({createdAt:{seconds:Date.parse(d.createdAt)/1000}},[]),'2026-09-26');
});
test('daily shipments: invalid calendar dates rejected and leap days accepted',()=>{
 assert.equal(calendar.validDeliveryDate('2026-02-30'),false);
 assert.equal(calendar.validDeliveryDate('2024-02-29'),true);
 assert.equal(calendar.validDeliveryDate('2026-2-01'),false);
});

