const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load() {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/core/driver-actions.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports});
 return exports;
}
test('REQ03 WhatsApp normalizes BR phone without duplicating country code and encodes message', () => {
 const {arrivalWhatsApp}=load();
 const url=new URL(arrivalWhatsApp({phone:'(34) 99999-1234',customerName:'Ana & João'}));
 assert.equal(url.hostname,'wa.me'); assert.equal(url.pathname,'/5534999991234');
 assert.match(url.searchParams.get('text'),/Ana & João/); assert.match(url.searchParams.get('text'),/BlackOut Shop Brazil/);
 assert.equal(new URL(arrivalWhatsApp({phone:'+55 34 99999-1234',customerName:'Ana'})).pathname,url.pathname);
});
test('REQ03 invalid and missing phones do not produce a WhatsApp link', () => {
 const {arrivalWhatsApp}=load();
 for(const phone of ['', '123', '00000000000','abc34999991234']) assert.equal(arrivalWhatsApp({phone,customerName:'Ana'}),null);
});
