const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(compute,loader){
 const exports={};
 const withAbort=(promise,signal)=>new Promise((resolve,reject)=>{const abort=()=>reject(new DOMException('Aborted','AbortError'));if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/core/route-estimator.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{exports,Date,DOMException,require:name=>name==='@angular/core'?{Injectable:()=>c=>c}:{loadGoogleMaps:loader??(async()=>({importLibrary:async()=>({Route:{computeRoutes:compute}})})),withAbort}});
 return exports;
}
test('arrival times accumulate ordered driving legs and stop time only between customers',()=>{
 const {arrivalEstimates}=load();
 const result=arrivalEstimates(['second','first'],[{duration:120},{duration:300}],Date.parse('2026-09-27T12:00:00Z'));
 assert.equal(result.second,'2026-09-27T12:02:00.000Z');
 assert.equal(result.first,'2026-09-27T12:10:00.000Z');
 assert.throws(()=>arrivalEstimates(['one'],[],Date.now()),/incompleta/);
 assert.throws(()=>arrivalEstimates(['one'],[{duration:NaN}],Date.now()),/inválida/);
});
test('Google routing starts at number621 then supplied destinations, milliseconds converted and no names/phones sent',async()=>{
 let request;
 const {RouteEstimator}=load(async r=>{request=r;return {routes:[{legs:[{durationMillis:120000},{durationMillis:300000}]}]};});
 const result=await new RouteEstimator().calculate([{id:'a',lat:-19.75,lng:-47.93,customerName:'PRIVATE'},{id:'b',lat:-19.76,lng:-47.94}],new AbortController().signal);
 assert.equal(request.origin.lng,-47.9483885);assert.equal(request.origin.lat,-19.7424531);
 assert.equal(request.intermediates[0].location.lng,-47.93);assert.equal(request.destination.lng,-47.94);
 assert.equal(request.optimizeWaypointOrder,false);assert.equal(request.fields[0],'legs.durationMillis');
 assert.equal('departureTime' in request,false);assert.equal(request.routingPreference,'TRAFFIC_AWARE');
 assert.ok(!JSON.stringify(request).includes('PRIVATE'));assert.deepEqual(Object.keys(result),['a','b']);
 assert.equal(Date.parse(result.b)-Date.parse(result.a),480000);
});
test('missing coordinates and provider errors never invent an estimate',async()=>{
 let calls=0;const {RouteEstimator}=load(async()=>{calls++;throw new Error('indisponível');});
 await assert.rejects(new RouteEstimator().calculate([{id:'a'}],new AbortController().signal),/destino válido/);assert.equal(calls,0);
 await assert.rejects(new RouteEstimator().calculate([{id:'a',lat:-19.75,lng:-47.93}],new AbortController().signal),/indisponível/);
});

test('99 stops batch into at most25 intermediates, bridge origin and keep stop time across batches',async()=>{
 const requests=[];const {RouteEstimator}=load(async r=>{requests.push(r);return{routes:[{legs:Array.from({length:r.intermediates.length+1},()=>({durationMillis:60000}))}]};});
 const stops=Array.from({length:99},(_,i)=>({id:String(i),lat:-19.7-i*.0001,lng:-47.9}));
 const result=await new RouteEstimator().calculate(stops,new AbortController().signal);
 assert.equal(requests.length,4);assert.equal(requests[0].intermediates.length,25);
 assert.equal(requests[1].origin.lat,stops[25].lat);assert.equal(requests[3].destination.lat,stops[98].lat);
 assert.ok(requests[1].departureTime.getTime()>Date.now());
 assert.equal(Object.keys(result).length,99);assert.equal(Date.parse(result['26'])-Date.parse(result['25']),240000);
});

test('missing legs, negative duration, and failed subsequent batch never return partial ETA',async()=>{
 for(const response of [{routes:[]},{routes:[{legs:[]}]},{routes:[{legs:[{durationMillis:-1}]}]}]){
 const {RouteEstimator}=load(async()=>response);await assert.rejects(new RouteEstimator().calculate([{id:'a',lat:1,lng:1}],new AbortController().signal));
 }
 let calls=0;const {RouteEstimator}=load(async r=>{if(++calls===2)throw new Error('quota');return{routes:[{legs:Array.from({length:r.intermediates.length+1},()=>({durationMillis:1000}))}]};});
 await assert.rejects(new RouteEstimator().calculate(Array.from({length:27},(_,i)=>({id:String(i),lat:1,lng:1})),new AbortController().signal),/quota/);
});

test('abort during loader or Google route request rejects and ignores late results',async()=>{
 let finish;const deferred=new Promise(resolve=>finish=resolve),controller=new AbortController();
 const {RouteEstimator}=load(null,()=>deferred);const result=new RouteEstimator().calculate([{id:'a',lat:1,lng:1}],controller.signal);
 controller.abort();await assert.rejects(result,{name:'AbortError'});finish({});
 let complete;const c=new AbortController();const api=load(()=>new Promise(resolve=>complete=resolve));
 const pending=new api.RouteEstimator().calculate([{id:'a',lat:1,lng:1}],c.signal);
 for(let i=0;i<10&&!complete;i++)await Promise.resolve();
 c.abort();await assert.rejects(pending,{name:'AbortError'});complete?.({routes:[{legs:[{durationMillis:1000}]}]});
});

test('pre-abort skips loading and abort during routes-library import prevents computation',async()=>{
 let loads=0,compute=0,finish;const c=new AbortController();c.abort();
 const early=load(null,async()=>{loads++;return{};});
 await assert.rejects(new early.RouteEstimator().calculate([{id:'a',lat:1,lng:1}],c.signal),{name:'AbortError'});assert.equal(loads,0);
 const controller=new AbortController(),pendingLibrary=new Promise(resolve=>finish=resolve);
 const api=load(null,async()=>({importLibrary:()=>pendingLibrary}));
 const result=new api.RouteEstimator().calculate([{id:'a',lat:1,lng:1}],controller.signal);
 await Promise.resolve();await Promise.resolve();controller.abort();
 await assert.rejects(result,{name:'AbortError'});finish({Route:{computeRoutes:()=>compute++}});
 await Promise.resolve();assert.equal(compute,0);
});
