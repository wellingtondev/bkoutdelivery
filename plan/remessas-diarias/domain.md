# Domínio — remessas-diarias-20260928

Responsável: contexto isolado payment_scope, FIO/CodIA. Resultado de implementação local, sem aprovação independente.

## Contratos

- `recurringShipments(shipments)` fornece um representante por HH:mm, ordenado pelo horário; preferência pelo ID canônico `slot-HHmm`, depois menor ID estável. Não altera nem exclui documentos históricos.
- `deliveryDay(delivery, shipments)` resolve data explícita válida, criação em São Paulo, depois data histórica da remessa. Ausência retorna null. A data de conclusão não participa: o fechamento continua baseado na conclusão.
- `validDeliveryDate` valida YYYY-MM-DD real; `saoPauloDay` fornece a data operacional em São Paulo.
- Novas entregas persistem `deliveryDate`. Chamadores legados sem campo recebem hoje em São Paulo; campo informado inválido é rejeitado.
- Criação de horário reutiliza representante carregado. Se não existe, transação em `shipments/slot-HHmm` cria somente documento ausente e preserva documento já existente, evitando novas duplicatas concorrentes entre clientes atualizados.

## Evidências observadas

- Baseline antes das mudanças: `npm.cmd run test:features`, 69/69 passando.
- RED: `node --test tests/shipment-calendar.test.cjs tests/delivery.service.test.cjs`: falhas esperadas por helper ausente, criação retornar ID aleatório em vez de recorrente, não reutilizar horário e não persistir data explícita.
- GREEN: mesmo comando, 42/42 passando após implementação, incluindo compatibilidade do default hoje.
- Ajuste do harness: transpile dos helpers para ES2022, coerente com o runtime do projeto; o default ES5 de transpileModule não iterava Map corretamente.

## Limites

Não houve migração destrutiva, exclusão histórica, alteração das regras ou acesso ao Firestore real. Novos clientes com dados legados ainda não carregados podem criar um slot canônico adicional ao legado; a visão deduplicada mantém o horário único e o histórico de ambos deve continuar acessível por HH:mm. A UI e a validação independente pertencem à coordenação e às outras frentes.
