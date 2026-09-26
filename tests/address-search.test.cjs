const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('src/app/core/address-search.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup(fetch) { const exports = {}; vm.runInNewContext(source, { exports, URLSearchParams, fetch }); return exports.searchUberaba; }
const feature = (city = 'Uberaba', type = 'street') => ({ properties: { city, countrycode: 'BR', type, name: 'Rua Exemplo' }, geometry: { coordinates: [-47.94, -19.75] } });
test('search restricts results to Uberaba and forwards cancellation signal', async () => {
  const controller = new AbortController();
  const search = setup(async (url, options) => {
    assert.match(new URL(url).searchParams.get('q'), /Uberaba, Minas Gerais, Brasil/);
    assert.equal(options.signal, controller.signal);
    return { ok: true, json: async () => ({ features: [feature('Uberlândia'), feature()] }) };
  });
  const result = await search('Rua Exemplo', controller.signal);
  assert.equal(result.lat, -19.75); assert.match(result.label, /Uberaba/);
});
test('does not mark city centroids or invalid coordinates as an address', async () => {
  const invalid = feature(); invalid.geometry.coordinates = [NaN, null];
  const search = setup(async () => ({ ok: true, json: async () => ({ features: [feature('Uberaba', 'city'), invalid] }) }));
  assert.equal(await search('Uberaba', new AbortController().signal), null);
});
test('provider errors propagate for manual fallback', async () => {
  const search = setup(async () => ({ ok: false }));
  await assert.rejects(search('Rua Exemplo', new AbortController().signal), /indisponível/);
});
