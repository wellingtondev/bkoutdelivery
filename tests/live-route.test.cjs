const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const origin={lat:-19.74,lng:-47.94},destination={lat:-19.75,lng:-47.95};
function load(compute,loader){
 const exports={};const withAbort=(p,s)=>new Promise((resolve,reject)=>{const cancel=()=>reject(new DOMException('aborted','AbortError'));if(s.aborted)return cancel();s.addEventListener('abort',cancel,{once:true});p.then(resolve,reject).finally(()=>s.removeEventListener('abort',cancel));});
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/core/live-route.service.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{exports,Date,DOMException,require:name=>name==='@angular/core'?{Injectable:()=>x=>x}:{loadGoogleMaps:loader??(async()=>({importLibrary:async()=>({Route:{computeRoutes:compute}})})),withAbort}});return new exports.LiveRouteService();
}
const valid=()=>({routes:[{path:[{...origin,altitude:0},{...destination,altitude:0}],durationMillis:120000,distanceMeters:850}]});
test('live route uses Google road path and traffic duration, returns copied plain coordinates and arrival',async()=>{
 let request;const response=valid();const service=load(async r=>{request=r;return response;});
 const result=await service.calculate({...origin,phone:'private'},destination,new AbortController().signal);
 assert.equal(request.travelMode,'DRIVING');assert.equal(request.routingPreference,'TRAFFIC_AWARE');
 assert.equal(request.fields.join(','),'path,durationMillis,distanceMeters');assert.ok(!JSON.stringify(request).includes('private'));
 assert.equal(result.durationSeconds,120);assert.equal(result.distanceMeters,850);assert.equal(result.arrivalTime-result.calculatedAt,120000);
 assert.equal(result.path[0].lat,origin.lat);assert.equal('altitude' in result.path[0],false);
 response.routes[0].path[0].lat=0;assert.equal(result.path[0].lat,origin.lat);
});
test('live route invalid input or Google result never fabricates path or ETA',async()=>{
 let calls=0;const service=load(async()=>{calls++;return valid();});
 for(const point of [null,{lat:NaN,lng:0},{lat:91,lng:0},{lat:0,lng:181}])await assert.rejects(service.calculate(point,destination,new AbortController().signal),/coordenadas/);
 assert.equal(calls,0);
 for(const changes of [{path:null},{path:[]},{path:[origin]},{path:[origin,{lat:NaN,lng:0}]},{durationMillis:-1},{durationMillis:Infinity},{distanceMeters:-1},{distanceMeters:null}]){
 const response=valid();Object.assign(response.routes[0],changes);await assert.rejects(load(async()=>response).calculate(origin,destination,new AbortController().signal),/rota/i);
 }
 await assert.rejects(load(async()=>({routes:[]})).calculate(origin,destination,new AbortController().signal),/rota/i);
 await assert.rejects(load(async()=>{throw new Error('quota');}).calculate(origin,destination,new AbortController().signal),/quota/);
});
test('live route abort ignores late loader and request results',async()=>{
 for(const phase of ['loader','request']){
 let finish;const pending=new Promise(resolve=>finish=resolve),c=new AbortController();
 const service=phase==='loader'?load(null,()=>pending):load(()=>pending);
 const result=service.calculate(origin,destination,c.signal);
 await Promise.resolve();await Promise.resolve();await Promise.resolve();c.abort();
 await assert.rejects(result,{name:'AbortError'});finish(phase==='loader'?{}:valid());
 }
 const c=new AbortController();c.abort();await assert.rejects(load(()=>valid()).calculate(origin,destination,c.signal),{name:'AbortError'});
});
