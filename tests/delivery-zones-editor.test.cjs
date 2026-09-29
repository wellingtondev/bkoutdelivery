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
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{exports,require:name=>name==='@angular/core'?{Component:noop,Input:noop,Output:noop,ViewChild:noop,signal,EventEmitter}:name.includes('google-maps')?{loadGoogleMaps:async()=>{throw new Error('Configure a chave do Google Maps para carregar o mapa.');}}:{validateDeliveryZones:()=>invalid},structuredClone});
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
test('REQ01 Google map overlay displays yellow below green and removes invalid zones',()=>{
 const exports={},polygons=[];let invalid=null;let removed=0;
 const noop=()=>()=>{};
 const source=fs.readFileSync(path.join(__dirname,'../src/app/components/delivery-map/delivery-map.component.ts'),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{exports,require:name=>name==='@angular/core'?{Component:noop,Input:noop,Output:noop,ViewChild:noop,signal:()=>()=>false,EventEmitter:class{}}:name.includes('google-maps')?{}:{validateDeliveryZones:()=>invalid}});
 const map=new exports.DeliveryMapComponent({});map.map={};map.maps={Polygon:class{constructor(options){polygons.push(options);}setMap(value){assert.equal(value,null);removed++;}}};map.zones={schemaVersion:1,green:[{lat:1,lng:1}],yellow:[{lat:2,lng:2}]};map.ngOnChanges();assert.equal(polygons.length,2);assert.equal(polygons[0].paths,map.zones.yellow);assert.equal(polygons[1].paths,map.zones.green);assert.equal(polygons[0].clickable,false);
 invalid='Invalid';map.ngOnChanges();assert.equal(polygons.length,2);assert.equal(removed,2);
});
test('Google editor missing API key exposes error instead of uncaught rejection',async()=>{
 const {editor}=setup();await editor.ngAfterViewInit();assert.equal(editor.tileError(),true);assert.equal(editor.mapLoading(),false);
});

test('Google map uses wolf DOM marker and releases markers/polygons/listeners on destroy',()=>{
 const exports={},markers=[];let cleared=0,disconnected=0;
 const noop=()=>()=>{};
 const source=fs.readFileSync(path.join(__dirname,'../src/app/components/delivery-map/delivery-map.component.ts'),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{exports,document:{createElement:()=>({style:{},setAttribute(){}})},require:name=>name==='@angular/core'?{Component:noop,Input:noop,Output:noop,ViewChild:noop,signal:()=>()=>false,EventEmitter:class{}}:name.includes('google-maps')?{}:{validateDeliveryZones:()=>null}});
 const component=new exports.DeliveryMapComponent({});component.map={setCenter(){},setZoom(){}};
 component.maps={event:{clearInstanceListeners:()=>cleared++}};
 component.Marker=class{constructor(options){Object.assign(this,options);markers.push(this);}addListener(){return {remove(){}};}};
 component.driverPosition={lat:-19.747,lng:-47.939};component.ngOnChanges();assert.equal(markers.length,1);assert.equal(markers[0].content.textContent,'🐺');assert.equal(markers[0].title,'Última localização do entregador Blackout');
 component.observer={disconnect:()=>disconnected++};component.ngOnDestroy();assert.equal(markers[0].map,null);assert.equal(disconnected,1);assert.equal(cleared,2);
});
