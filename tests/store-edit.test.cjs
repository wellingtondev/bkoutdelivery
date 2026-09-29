const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const path=require('node:path');
const signal=value=>{const get=()=>value;get.set=next=>value=next;return get;};
const decorator=()=>()=>{};
function load(file,deps={}){
  const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/app/',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
  const exports={};vm.runInNewContext(code,{exports,Date,Intl,AbortController,setTimeout,clearTimeout,require:name=>{if(name in deps)return deps[name];throw Error(name);}});return exports;
}
const core={effect:fn=>fn(),Component:decorator,Input:decorator,Output:decorator,signal,computed:fn=>fn,EventEmitter:class{values=[];emit(value){this.values.push(value);}}};
const dates=load('core/shipment-calendar.ts');
let lookup=async()=>null;
const {StoreComponent}=load('pages/store/store.component.ts',{'@angular/core':core,'@angular/common':{},'@angular/forms':{},'@angular/router':{},'../../core/shipment-calendar':dates,'../../core/address-autocomplete':{AddressAutocomplete:class{suggest(...args){return lookup(...args);}select(...args){return lookup(...args);}reset(){}},addressSearchError:()=> 'Busca indisponível. Marque no mapa.'},'../../core/delivery-zones.service':{},'../../core/delivery-zones':{deliveryFeeForPoint:(point)=>Number.isFinite(point.lat)?{zone:point.lat<1?'GREEN':point.lat<2?'YELLOW':'OUTSIDE',fee:point.lat<1?10:point.lat<2?12:15}:null},'../../components/delivery-zones-editor/delivery-zones-editor.component':{},'../../core/payment':{},'../../components/customer-map/customer-map.component':{},'../../components/delivery-map/delivery-map.component':{},'../../components/monthly-summary/monthly-summary.component':{}});

function setup(){const calls=[];const zones={config:signal({green:[],yellow:[]}),loading:signal(false),error:signal('')};const service={shipments:signal([{id:'slot',time:'18:00',date:'2026-09-20'}]),deliveries:signal([]),async add(d){calls.push({kind:'add',d});},async updateDelivery(shipment,id,d){calls.push({kind:'update',shipment,id,d});}};return {c:new StoreComponent(service,{},zones),calls,zones};}
const record=()=>({id:'delivery',trackingToken:'token',shipmentId:'slot',deliveryDate:'2026-09-20',customerName:'Ana',phone:'123',address:'Rua A 123',product:'Pedido',orderValue:100,deliveryFee:7,paid:false,paymentMethod:'CREDIT',installments:2,notes:'Portão azul',lat:1,lng:0,status:'WAITING'});
test('editing clones original and preserves historical fee on open; cancel does not mutate',()=>{const {c}=setup(),d=record();c.edit(d);c.refreshDeliveryFee();assert.equal(c.form.deliveryFee,7);assert.equal(c.form.notes,'Portão azul');assert.equal(c.destination().lat,1);c.form.customerName='Edited';c.closeDelivery();assert.equal(d.customerName,'Ana');assert.equal(c.editing(),null);});
test('edit saves update only using original shipment and date, retaining payment/notes',async()=>{const {c,calls}=setup();c.edit(record());c.form.shipmentId='tampered';c.form.deliveryDate='2099-01-01';c.form.notes='Nova nota';await c.save();assert.equal(calls.length,1);assert.equal(calls[0].kind,'update');assert.equal(calls[0].shipment,'slot');assert.equal(calls[0].id,'delivery');assert.equal(calls[0].d.deliveryDate,'2026-09-20');assert.equal(calls[0].d.shipmentId,'slot');assert.equal(calls[0].d.deliveryFee,7);assert.equal(calls[0].d.installments,2);assert.equal(calls[0].d.notes,'Nova nota');});
test('editing changed destination recalculates fee; unchanged destination preserves historical fee with zones unavailable',()=>{const {c,zones}=setup();c.edit(record());zones.error.set('offline');c.refreshDeliveryFee();assert.equal(c.form.deliveryFee,7);assert.equal(c.feeReady(),true);zones.error.set('');c.selectDestination({lat:2,lng:0});assert.equal(c.form.deliveryFee,15);});
test('new delivery after cancelling edit uses add with fresh draft',async()=>{const {c,calls}=setup();c.edit(record());c.closeDelivery();c.open();assert.equal(c.form.customerName,'');assert.equal(c.editing(),null);c.form={...record(),shipmentId:'slot'};c.selectDestination({lat:1,lng:0});await c.save();assert.equal(calls[0].kind,'add');});
test('address text changes keep historical fee when confirmed coordinates match original',()=>{const {c}=setup();c.edit(record());c.form.address='Rua A 123, complemento';c.destinationChanged.set(true);c.selectDestination({lat:1,lng:0});assert.equal(c.form.deliveryFee,7);assert.equal(c.preserveFee(),true);});
test('completed delivery cannot open edit or mutate existing draft',()=>{const {c,calls}=setup();const original=c.form;c.edit({...record(),status:'DELIVERED'});assert.equal(c.show(),false);assert.equal(c.editing(),null);assert.equal(c.form,original);assert.equal(calls.length,0);});


