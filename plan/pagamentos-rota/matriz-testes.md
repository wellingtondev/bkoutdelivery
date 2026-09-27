# Matriz FIO
Ciclo pagamentos-rota-20260926.
REQ01 → método obrigatório, parcelas, limpeza quando pago, privacidade → tests/payment.test.cjs e tests/delivery.service.test.cjs; red e green registrados task01.
REQ02 → remessas/expandir/recolher, ações → inspeção independente e navegador com fixtures (pendente).
REQ03 → normalização, inválidos e encode mensagem → tests/driver-actions.test.cjs: 2/2; envio real não executado.
REQ04 → transação rota/ownership/renumeração e tracking → testes service e navegador (em andamento).
REQ05 → próprias/concluídas/fuso/centavos/hoje independente mês → tests/driver-history.test.cjs:7/7.
Baseline antes implementação43/43. Sem gravação Firebase nem WhatsApp real.
