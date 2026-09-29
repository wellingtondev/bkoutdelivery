# TASK02 — Persistência da edição
Ciclo loja-prioridade-20260929, REQ02. Implementação root em sequência após indisponibilidade do agente delegado. Contrato updateDelivery(shipmentId,id,NewDelivery).
- [x] Arquitetura: transação autenticada STORE; identidade, dia/remessa, status e driver preservados.
- [x] TDD: 2 testes falharam por método inexistente antes da implementação; 4 cenários finais verdes.
- [x] Implementação: dados privados separados do tracking; taxa histórica se destino igual; recalcular destino alterado e invalidar previsões da rota; impedir alteração de concluída/pagamento já confirmado.
- [ ] ConfIA final independente: review.md, aguardando reanálise após correções.
Evidência: node --test --test-name-pattern='store edit' tests/delivery.service.test.cjs, 4/4. Sem gravações Firebase reais. Regras existentes autorizam STORE; nenhuma permissão pública de edição adicionada.
