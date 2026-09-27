const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/core/payment.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: api });
const base = { paid: false, orderValue: 100.10, deliveryFee: 8.20 };
test('collection sums order and fee in cents; paid orders collect zero', () => {
  assert.equal(api.amountToCollect(base), 108.30);
  assert.equal(api.amountToCollect({ ...base, paid: true }), 0);
});
test('new unpaid orders require supported method and credit installments', () => {
  for (const fields of [{}, { paymentMethod: 'OTHER' }, { paymentMethod: 'CREDIT' }, { paymentMethod: 'CREDIT', installments: 4 }]) {
    assert.throws(() => api.normalizePayment({ ...base, ...fields }), /pagamento|parcelas/);
  }
  for (const installments of [1, 2, 3]) assert.equal(api.normalizePayment({ ...base, paymentMethod: 'CREDIT', installments }).installments, installments);
});
test('normalization removes stale billing fields and trims private notes', () => {
  const paid = api.normalizePayment({ ...base, paid: true, paymentMethod: 'CREDIT', installments: 3, notes: '  Portão azul  ' });
  assert.equal(paid.paymentMethod, undefined);
  assert.equal(paid.installments, undefined);
  assert.equal(paid.notes, 'Portão azul');
  for (const paymentMethod of ['PIX', 'CASH', 'DEBIT']) assert.equal(api.normalizePayment({ ...base, paymentMethod, installments: 3 }).installments, undefined);
  assert.throws(() => api.normalizePayment({ ...base, paymentMethod: 'PIX', notes: 'a'.repeat(501) }), /500/);
});
test('payment labels tolerate legacy data without inventing a method or installments', () => {
  assert.equal(api.paymentLabel(base), 'Forma de pagamento não informada');
  assert.equal(api.paymentLabel({ ...base, paymentMethod: 'CREDIT' }), 'Crédito · parcelas não informadas');
  assert.equal(api.paymentLabel({ ...base, paymentMethod: 'CREDIT', installments: 2 }), 'Crédito em 2x');
  assert.equal(api.paymentLabel({ ...base, paymentMethod: 'DEBIT' }), 'Débito');
  assert.equal(api.paymentLabel({ ...base, paid: true }), 'Pago');
});
