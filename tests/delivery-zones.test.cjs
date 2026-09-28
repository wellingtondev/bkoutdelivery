const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const z={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/core/delivery-zones.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:z});
const p=(lng,lat)=>({lat,lng}), square=(a,b)=>[p(a,a),p(b,a),p(b,b),p(a,b)];
const zones={schemaVersion:1,green:square(1,2),yellow:square(0,3)};
test('zones: green priority, yellow ring, outside and inclusive edges have fixed fees',()=>{
 assert.equal(z.validateDeliveryZones(zones),null);
 for(const [point,zone,fee] of [[p(1.5,1.5),'GREEN',10],[p(1,1),'GREEN',10],[p(0,1),'YELLOW',12],[p(2.5,2.5),'YELLOW',12],[p(4,4),'OUTSIDE',15]]) {
 const q=z.deliveryFeeForPoint(point,zones);assert.equal(q.zone,zone);assert.equal(q.fee,fee);
 }
 assert.equal(z.deliveryFeeForPoint(p(NaN,1),zones),null);
});
test('zones: reject invalid schema, degenerate, self crossing and uncontained polygons',()=>{
 for(const invalid of [null,{...zones,schemaVersion:2},{...zones,green:[p(1,1),p(1,1),p(2,2)]},{...zones,green:[p(0,0),p(2,2),p(0,2),p(2,0)]},{...zones,green:square(2,4)},{...zones,yellow:Array(81).fill(p(1,1))}]) {
 assert.equal(typeof z.validateDeliveryZones(invalid),'string');assert.equal(z.deliveryFeeForPoint(p(1,1),invalid),null);
 }
});
test('zones: concave yellow rejects green edges crossing exterior even with every vertex inside',()=>{
 const yellow=[p(0,0),p(5,0),p(5,5),p(3,5),p(3,2),p(2,2),p(2,5),p(0,5)];
 assert.equal(typeof z.validateDeliveryZones({schemaVersion:1,yellow,green:[p(1,4),p(4,4),p(2.5,1)]}),'string');
 assert.equal(z.validateDeliveryZones({schemaVersion:1,yellow,green:[p(.5,.5),p(4.5,.5),p(2.5,1)]}),null);
});
