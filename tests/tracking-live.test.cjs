const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const api={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/pages/tracking/tracking-route.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports:api,AbortController});
const input=(now=100000)=>({key:'token|destination',enabled:true,origin:{lat:-19.75,lng:-47.94},destination:{lat:-19.76,lng:-47.93},now});
const result={path:[input().origin,input().destination],durationSeconds:300,distanceMeters:1000,calculatedAt:100000,arrivalTime:400000};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){const requests=[],states=[];const controller=new api.TrackingRouteController((origin,destination,signal)=>new Promise((resolve,reject)=>requests.push({origin,destination,signal,resolve,reject})),state=>states.push(state));return{controller,requests,states};}
test('live tracking throttles to 60 seconds and changing GPS does not abort pending route',async()=>{
 const {controller,requests}=setup();controller.update(input());controller.update({...input(105000),origin:{lat:-19.751,lng:-47.941}});assert.equal(requests.length,1);assert.equal(requests[0].signal.aborted,false);assert.equal(requests[0].origin.lat,-19.75);
 requests[0].resolve(result);await flush();controller.update(input(159999));assert.equal(requests.length,1);controller.update(input(160000));assert.equal(requests.length,2);
});
test('stale GPS clears line and ETA and aborted late result never returns',async()=>{
 const {controller,requests,states}=setup();controller.update(input());controller.update({...input(145000),enabled:false});assert.equal(requests[0].signal.aborted,true);requests[0].resolve(result);await flush();assert.equal(states.at(-1).result,null);assert.equal(states.at(-1).loading,false);
});
test('changed token/destination cancels pending request and suppresses superseded result',async()=>{
 const {controller,requests,states}=setup();controller.update(input());controller.update({...input(160000),key:'other-token|other-destination'});assert.equal(requests.length,2);assert.equal(requests[0].signal.aborted,true);requests[1].resolve({...result,arrivalTime:500000});await flush();requests[0].resolve(result);await flush();assert.equal(states.at(-1).result.arrivalTime,500000);
});
test('routing error hides previous route; retries respect throttle; destroy cancels',async()=>{
 const {controller,requests,states}=setup();controller.update(input());requests[0].resolve(result);await flush();controller.update(input(160000));requests[1].reject(new Error('route unavailable'));await flush();assert.equal(states.at(-1).result,null);assert.equal(states.at(-1).error,true);controller.update(input(165000));assert.equal(requests.length,2);controller.update(input(220000));controller.destroy();assert.equal(requests[2].signal.aborted,true);
});
test('direct live ETA is excluded for later stops and countdown uses arrival time',()=>{
 assert.equal(api.liveArrival(result,true,2),0);assert.equal(api.liveArrival(result,false,1),0);assert.equal(api.liveArrival(result,true,1),400000);assert.equal(api.liveArrival(result,true),400000);assert.equal(api.remainingMinutes(400000,280000),2);assert.equal(api.remainingMinutes(400000,400001),0);
});
