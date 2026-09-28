const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
const zones={};vm.runInNewContext(compile('src/app/core/delivery-zones.ts'),{exports:zones});
function setup(){
 const listeners=[],writes=[],auth={currentUser:null};let callback,writeError,release;let pendingWrite=false;
 const modules={'@angular/core':{Injectable:()=>x=>x,signal:initial=>{let value=initial;const s=()=>value;s.set=v=>value=v;return s;}},'firebase/auth':{onAuthStateChanged:(_,cb)=>{callback=cb;return()=>{};}},'./firebase':{auth,db:{}},'./delivery-zones':zones,'firebase/firestore':{doc:(_, ...parts)=>({path:parts.join('/')}),onSnapshot:(ref,next,error)=>{const item={ref,next,error,stopped:false};listeners.push(item);return()=>item.stopped=true;},setDoc:async(ref,data)=>{writes.push({ref,data});if(pendingWrite)await new Promise(resolve=>release=resolve);if(writeError)throw writeError;}}};
 const exports={};vm.runInNewContext(compile('src/app/core/delivery-zones.service.ts'),{exports,require:key=>modules[key]});
 const service=new exports.DeliveryZonesService();return{service,listeners,writes,failWrite:error=>writeError=error,deferWrite:()=>pendingWrite=true,releaseWrite:()=>release(),login:user=>{auth.currentUser=user;callback(user);},emit:(index,data)=>listeners[index].next({exists:()=>!!data,data:()=>data})};
}
const poly=(a,b)=>[{lat:a,lng:a},{lat:a,lng:b},{lat:b,lng:b},{lat:b,lng:a}];const config={schemaVersion:1,green:poly(1,2),yellow:poly(0,3)};
test('zone config only subscribes for active store and discards callbacks after logout',async()=>{
 const h=setup();h.login({uid:'driver'});h.emit(0,{role:'DRIVER'});assert.equal(h.listeners.length,1);
 h.login({uid:'store'});h.emit(1,{role:'STORE'});h.emit(2,config);assert.equal(h.service.config().schemaVersion,1);
 await h.service.save(config);assert.equal(h.writes.length,1);
 h.login(null);h.emit(2,config);assert.equal(h.service.config(),null);assert.equal(h.service.loading(),false);
 await assert.rejects(h.service.save(config),/loja/);
});
test('invalid config and read failures are errors, never absent configuration',()=>{
 const h=setup();h.login({uid:'s'});h.emit(0,{role:'STORE'});h.emit(1,{schemaVersion:2});assert.equal(h.service.config(),null);assert.ok(h.service.error());
 h.listeners[1].error(new Error('denied'));assert.ok(h.service.error());assert.equal(h.service.loading(),false);
});

test('save failure keeps prior saved configuration and propagates the write error',async()=>{
 const h=setup();h.login({uid:'s'});h.emit(0,{role:'STORE'});h.emit(1,config);
 h.failWrite(new Error('permission-denied'));
 await assert.rejects(h.service.save({...config,green:poly(.5,2.5)}),/permission-denied/);
 assert.equal(h.service.config(),config);
});

test('driver and inactive store cannot save zone settings',async()=>{
 for(const profile of [{role:'DRIVER'},{role:'STORE',active:false}]){
 const h=setup();h.login({uid:'u'});h.emit(0,profile);
 await assert.rejects(h.service.save(config),/loja/);assert.equal(h.writes.length,0);
 }
});

test('successful save clones input and updates local configuration before any new snapshot',async()=>{
 const h=setup();h.login({uid:'s'});h.emit(0,{role:'STORE'});h.emit(1,config);
 const edited={schemaVersion:1,green:poly(.5,2.5),yellow:poly(0,3)};
 h.deferWrite();const saving=h.service.save(edited);
 edited.green[0].lat=77;
 assert.equal(h.writes[0].data.green[0].lat,.5);
 assert.equal(h.service.config(),config);
 h.releaseWrite();await saving;
 assert.equal(h.service.config().green[0].lat,.5);
 assert.equal(h.service.loading(),false);assert.equal(h.service.error(),'');
});

test('logout or profile revocation during pending save never restores private config',async()=>{
 for(const revoke of ['logout','inactive']){
 const h=setup();h.login({uid:'s'});h.emit(0,{role:'STORE'});h.emit(1,config);
 h.deferWrite();const saving=h.service.save(config);
 if(revoke==='logout')h.login(null);else h.emit(0,{role:'STORE',active:false});
 h.releaseWrite();await saving;
 assert.equal(h.service.config(),null);assert.equal(h.service.loading(),false);
 await assert.rejects(h.service.save(config),/loja/);
 }
});

