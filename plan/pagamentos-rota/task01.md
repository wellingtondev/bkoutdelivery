# TASK-01 Pagamento e observações
Ciclo pagamentos-rota-20260926. REQ-01. Escopo models/models.ts, core/delivery.service.ts (somente criação), core/payment.ts, pages/store/* e tests/payment.test.cjs.
Contrato: paymentMethod?: CREDIT|DEBIT|PIX|CASH; installments?:1|2|3; notes?:string. Não pago exige método e crédito exige parcelas; pago remove dados de cobrança. Observação até 500 caracteres, privada. Legados continuam legíveis. Não modificar métodos de rota no service.
- [x] Arquitetura — validado: contratos acima
- [x] Desenho TDD — validado: testes payment.test.cjs criados antes do helper; execução inicial vermelha por módulo ausente (ENOENT).
- [x] Implementação — validado: helper de normalização/cobrança, campos opcionais no modelo, formulário condicional da loja, persistência privada e compatibilidade legada.
- [x] Validação independente — validado: revisao.md (ConfIA), 60 testes, build e visual.md

## Evidência técnica local
26/09/2026: `node --test tests/payment.test.cjs tests/delivery.service.test.cjs` passou 26/26. Cobertura de métodos/parcelas inválidos, valores em centavos, limpeza de campos em pedido pago, observações500, rótulos legados e ausência de dados de cobrança/observação no documento público. `npm.cmd run build` passou (somente aviso CommonJS Leaflet preexistente). Validação independente e visual permanecem com coordenação FIO; nenhuma gravação Firebase realizada.

Double check ChefIA: escopo e evidências conferidos; revisão independente aprovada e visual ETA concluída.
