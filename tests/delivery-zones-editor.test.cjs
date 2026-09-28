const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const path=require('node:path');
function setup(){
 const exports={}; let invalid=null;
 const signal=value=>Object.assign(()=>value,{set:next=>value=next});
 const noop=()=>()=>{};
 class EventEmitter{values=[];emit(value){this.values.push(value);}}
 const source=fs.readFileSync(path.join(__dirname,'../src/app/components/delivery-zones-editor/delivery-zones-editor.component.ts'),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{exports,require:name=>name==='@angular/core'?{Component:noop,Input:noop,Output:noop,ViewChild:noop,signal,EventEmitter}:name==='leaflet'?{}:{validateDeliveryZones:()=>invalid},structuredClone});
 const editor=new exports.DeliveryZonesEditorComponent({run:fn=>fn(),runOutsideAngular:fn=>fn()});
 editor.zones={schemaVersion:1,green:[{lat:1,lng:1}],yellow:[{lat:2,lng:2}]}; editor.ngOnInit();
 return {editor,reject:message=>invalid=message};
}
test('REQ01 draft edits do not mutate saved zones; undo/clear affect only active zone',()=>{
 const {editor}=setup();editor.addVertex({lat:3,lng:3});assert.equal(editor.draft.green.length,2);assert.equal(editor.zones.green.length,1);
 editor.undo();assert.equal(editor.draft.green.length,1);editor.clear();assert.equal(editor.draft.green.length,0);assert.equal(editor.draft.yellow.length,1);
});
test('REQ01 cancel emits close without saving edited draft',()=>{
 const {editor}=setup();editor.clear();editor.close();assert.equal(editor.closed.values.length,1);assert.equal(editor.saveZones.values.length,0);
});
test('REQ01 invalid polygons block save and expose actionable validation error',()=>{
 const {editor,reject}=setup();reject('A zona verde precisa de três pontos.');editor.save();assert.equal(editor.saveZones.values.length,0);assert.match(editor.validationError(),/três/);
});
test('REQ01 save emits independent snapshot and saving/loading block mutations and close',()=>{
 const {editor}=setup();editor.save();assert.equal(editor.saveZones.values.length,1);editor.draft.green[0].lat=9;assert.equal(editor.saveZones.values[0].green[0].lat,1);
 editor.saving=true;editor.addVertex({lat:4,lng:4});editor.clear();editor.undo();editor.close();editor.save();assert.equal(editor.draft.green.length,1);assert.equal(editor.closed.values.length,0);assert.equal(editor.saveZones.values.length,1);
 editor.saving=false;editor.loading=true;editor.addVertex({lat:4,lng:4});assert.equal(editor.draft.green.length,1);
});
test('REQ01 nonfinite/out-of-bounds map vertices ignored',()=>{
 const {editor}=setup();for(const point of [{lat:NaN,lng:0},{lat:91,lng:0},{lat:0,lng:181}])editor.addVertex(point);assert.equal(editor.draft.green.length,1);
});
test('REQ01 moving vertices edits active zone only and incoming changes preserve draft',()=>{
 const {editor}=setup();editor.choose('yellow');editor.moveVertex(0,{lat:5,lng:6});assert.equal(editor.draft.yellow[0].lat,5);assert.equal(editor.draft.green[0].lat,1);assert.equal(editor.zones.yellow[0].lat,2);
 editor.zones={schemaVersion:1,green:[],yellow:[]};editor.ngOnChanges();assert.equal(editor.draft.yellow[0].lat,5);
 editor.saving=true;editor.moveVertex(0,{lat:7,lng:8});assert.equal(editor.draft.yellow[0].lat,5);
});
test('REQ01 map overlay displays yellow below green and removes invalid zones',()=>{
 const exports={},polygons=[];let invalid=null;let clears=0;
 const noop=()=>()=>{};
 const source=fs.readFileSync(path.join(__dirname,'../src/app/components/delivery-map/delivery-map.component.ts'),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{exports,require:name=>name==='@angular/core'?{Component:noop,Input:noop,Output:noop,ViewChild:noop,signal:()=>()=>false,EventEmitter:class{}}:name==='leaflet'?{polygon:(points,options)=>({addTo:()=>polygons.push({points,options})})}:{validateDeliveryZones:()=>invalid}});
 const map=new exports.DeliveryMapComponent({});map.zoneLayers={clearLayers:()=>clears++};map.zones={schemaVersion:1,green:[{lat:1,lng:1}],yellow:[{lat:2,lng:2}]};map.ngOnChanges();assert.equal(polygons.length,2);assert.equal(polygons[0].points,map.zones.yellow);assert.equal(polygons[1].points,map.zones.green);assert.equal(polygons[0].options.interactive,false);
 invalid='Invalid';map.ngOnChanges();assert.equal(polygons.length,2);assert.equal(clears,2);
});
