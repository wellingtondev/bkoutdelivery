# TASK01 — edição e ações da loja

Data: 2026-09-29. Contexto isolado `/root/delivery_map`. FIO 1.2.1 canônica previamente lida nesta sessão; escopo delegado exclusivo pages/store e tests/store-edit. Sem alterações a service/models/rules. Aprovação independente pendente.

Implementado: ações em ordem Tracking, Alterar entrega, Marcar como pago (quando pendente), Excluir entrega. Grid de 4 colunas desktop e 2 mobile, alvo mínimo 44px, exclusão com superfície e borda distintas. Modal existente abre em edição com cópia explícita dos campos permitidos, pagamento/parcelas/notas/coordenadas; cancelar descarta cópia. Salvar edição chama apenas updateDelivery, com remessa e data originais, sem criar outro tracking. Select remessa desabilitado no modo edição, contendo horários históricos para mostrar corretamente o original.

Taxa histórica preservada na abertura e edição de dados que não alteram destino, inclusive quando zonas não estão disponíveis. Alterar endereço ou posição exige nova validação/cálculo; campo taxa preservada é somente leitura. Nova entrega após cancelamento recebe formulário limpo.

TDD: `node --test tests/store-edit.test.cjs` inicialmente 4 falhas esperadas (`c.edit is not a function`). Após implementação, `node --test tests/store-edit.test.cjs tests/store-calendar.test.cjs`: 9 testes, 9 pass, 0 fail. Cenários: clone/cancelamento, update exclusivo com remessa/data preservadas e pagamento/notas, taxa histórica vs destino alterado, novo cadastro após cancelar edição. Regressões calendário/endereço/taxa incluídas.

`node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0. Build/inspeção visual e revisão final pelo coordenador/ConfIA. Não houve operações reais no Firebase nem validação visual por este agente.
Alinhamento final com persistência: texto do endereço corrigido com coordenadas iguais também preserva taxa; busca e marcador atualizam a comparação contra coordenadas originais. Teste adicional endpoint igual. Última execução: 10 testes, 10 pass, 0 fail.
