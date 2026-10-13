# TASK-01 - Troca de remessa
Cycle ID: remessa-historico-20261013. Requisitos: REQ-01, REQ-02.
Escopo: delivery.service.ts, store.component.ts/html, tests/delivery.service.test.cjs e tests/store-edit.test.cjs; integracao final inclui location.service.ts e tests/location.service.test.cjs para preservar GPS ativo durante troca.
Stack observado: Angular 20, TypeScript 5.9, Firebase modular 12, node:test com simulacoes offline.
Arquitetura: transacao le destino existente, entrega, tracking e manifesto antes de gravar; move documento mantendo ID, dia, status, tracking, pagamento e taxa; atualiza tracking.shipmentId e routeEntries. Colisao aborta. Permissoes STORE existentes permitem create/delete e atualizacao de routeEntries.
Dependencias: especificacao aprovada; baseline antes do TDD. Nenhuma dependencia da TASK-02.
Criterios: horario existente selecionavel; mesmo dia; tracking intacto; rota com nova referencia; concluida/sem permissao/destino ausente/colisao sem gravacao.
Validacao: TEST-01 troca atomica e referencias; TEST-02 rejeicoes; TEST-03 formulario preserva dia e encaminha horario selecionado.
## Checklist
- [x] Arquitetura e plano - validado; MaestrIA, promovido ChefIA; evidencia leitura do servico, regras e formulario.
- [x] Desenho de testes TDD - validado; ConfIA, promovido ChefIA; TEST-01/02 rejeitados antes da implementacao por bloqueio de remessa; TEST-03 encaminhava ID antigo. Teste de deduplicacao vermelho antes da correcao.
- [x] Implementacao - validado; CodIA /root/shipment; 76/76 focados incluindo GPS, promovido ChefIA.
- [x] Validacao final - validado; ConfIA /root/validation; GPS 11/11 e revisao independente da nova referencia; promovido ChefIA.

Falha de validacao - status: resolvida. Motivo: GPS ativo guarda referencia privada da remessa antiga e deixa de atualizar apos migracao; stop nao limpa tracking da remessa nova. Evidencia: leitura independente de location.service.ts pela integracao ChefIA. Acao: CodIA adicionar testes de remessa movida durante GPS e ajustar leitura pela referencia do tracking; ConfIA revalidar.

Correcao: TDD GPS 10/11 vermelho; 11/11 verde e revisado independentemente. Callback e stop leem referencia canonica preservando verificacoes de identidade, dono, status e sessao. Suite integrada final 162/162.

Evidencia integrada: npm.cmd run test:features 160/160, npm.cmd run build exit 0, browser QA 1440x1000 e 390x844 alteracao/salvamento/tracking sem overflow ou erros. Firebase remoto nao exercitado.
