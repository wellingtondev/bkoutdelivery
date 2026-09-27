const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(fetch){
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/core/route-estimator.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{exports,Date,fetch,require:()=>({Injectable:()=>c=>c})});
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
test('routing starts at number621 then each destination in supplied order; sends no names or phones',async()=>{
 let url;
 const {RouteEstimator}=load(async u=>{url=u;return {ok:true,json:async()=>({code:'Ok',routes:[{legs:[{duration:120},{duration:300}]}]})};});
 const result=await new RouteEstimator().calculate([{id:'a',lat:-19.75,lng:-47.93,customerName:'PRIVATE'},{id:'b',lat:-19.76,lng:-47.94}],new AbortController().signal);
 assert.ok(url.includes('-47.9483885,-19.7424531;-47.93,-19.75;-47.94,-19.76'));
 assert.ok(!url.includes('PRIVATE'));assert.deepEqual(Object.keys(result),['a','b']);
});
test('missing coordinates and provider errors never invent an estimate',async()=>{
 let calls=0;const {RouteEstimator}=load(async()=>{calls++;return {ok:false};});
 await assert.rejects(new RouteEstimator().calculate([{id:'a'}],new AbortController().signal),/destino válido/);assert.equal(calls,0);
 await assert.rejects(new RouteEstimator().calculate([{id:'a',lat:-19.75,lng:-47.93}],new AbortController().signal),/indisponível/);
});
