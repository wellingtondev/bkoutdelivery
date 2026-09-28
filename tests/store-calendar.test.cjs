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
  const exports={};vm.runInNewContext(code,{exports,Date,Intl,setTimeout,clearTimeout,require:name=>{if(name in deps)return deps[name];throw Error(name);}});return exports;
}
const core={Component:decorator,Input:decorator,Output:decorator,signal,computed:fn=>fn,EventEmitter:class{values=[];emit(value){this.values.push(value);}}};
const dates=load('core/shipment-calendar.ts');
const {StoreComponent}=load('pages/store/store.component.ts',{'@angular/core':core,'@angular/common':{},'@angular/forms':{},'@angular/router':{},'../../core/shipment-calendar':dates,'../../core/address-search':{},'../../core/payment':{},'../../components/delivery-map/delivery-map.component':{},'../../components/monthly-summary/monthly-summary.component':{}});
test('store calendar filters cards and list by delivery day while merging historical equal schedules',()=>{
  const shipments=[{id:'a',time:'18:00',date:'2026-09-26'},{id:'b',time:'18:00',date:'2026-09-28'}];
  const deliveries=[{id:'old',shipmentId:'a',deliveryDate:'2026-09-26',status:'DELIVERED'},{id:'new',shipmentId:'a',deliveryDate:'2026-09-28',status:'WAITING'},{id:'duplicate-slot',shipmentId:'b',deliveryDate:'2026-09-28',status:'DELIVERED'}];
  const component=new StoreComponent({shipments:signal(shipments),deliveries:signal(deliveries)},{});
  component.selectDate('2026-09-28');
  assert.equal(component.shipmentSlots().length,1);
  assert.equal(component.count('a'),2);assert.equal(component.delivered('a'),1);
  assert.deepEqual(Array.from(component.current(),d=>d.id),['new','duplicate-slot']);
  component.selectDate('2026-09-26');assert.equal(component.current()[0].id,'old');assert.equal(component.count('a'),1);
  component.selectDate('2026-09-27');assert.equal(component.current().length,0);
  component.open();assert.equal(component.form.deliveryDate,'2026-09-27');assert.equal(component.form.shipmentId,'a');
});
const closing=load('components/monthly-summary/monthly-summary.ts');
const {MonthlySummaryComponent}=load('components/monthly-summary/monthly-summary.component.ts',{'@angular/core':core,'@angular/common':{},'./monthly-summary':closing});
test('calendar emits selected day and month changes; live refresh retains selected date',()=>{
  const c=new MonthlySummaryComponent();c.selectedDate='2026-09-26';c.ngOnChanges();
  c.selectDay(28);assert.equal(c.dateSelected.values.at(-1),'2026-09-28');
  c.selectedDate='2026-09-28';c.ngOnChanges();assert.equal(c.selected.key,'2026-09-28');
  c.changeMonth(1);assert.equal(c.dateSelected.values.at(-1),'2026-10-01');
  c.currentMonth();assert.equal(c.dateSelected.values.at(-1),dates.saoPauloDay());
});
