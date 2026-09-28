# Contexto SIM — remessas diarias

Cycle/request ID: remessas-diarias-20260928. Projeto: Blackout Delivery.
Produtor: SIM 1.0.1; fonte verificada C:/Users/Pc Gamer/.codex/skills/sim/SKILL.md.
Estado: draft; resultado partial. Conhecimento esperado, sem promocao AS-IS.
Origem: pedido do usuario resumido pela coordenacao CIM em 28/09/2026: horarios recorrentes existentes, calendario para entregas do dia sem duplicacoes e permissao para loja excluir.
Vault: nao informado; comparacao e publicacao Obsidian bloqueadas. Historico anterior preservado em plan/pagamentos-rota/sim-context.md.

## Conhecimento esperado e impacto

| ID | Conhecimento de produto esperado | Impacto | Certeza | Evidencia |
|---|---|---|---|---|
| RD01 | A loja reutiliza os horarios de remessa ja existentes ao operar outro dia, sem precisar cadastrar repetidamente a mesma grade. | altera | confirmado | Solicitacao encaminhada pela CIM |
| RD02 | A selecao de uma data no calendario mostra as entregas daquele dia, mantendo as entregas historicas ligadas ao seu dia de operacao. | complementa | confirmado | Solicitacao encaminhada pela CIM |
| RD03 | Reabrir um dia ou repetir uma acao de cadastro nao deve duplicar a remessa daquele horario no mesmo dia. | complementa | confirmado | Pedido de ausencia de duplicacoes |
| RD04 | A loja pode excluir uma entrega; o acesso de entregador nao e ampliado para administrar exclusoes. | altera | confirmado | Permissao loja excluir, orientacao CIM |
| RD05 | Ao excluir uma entrega, seu link deixa de apresentar dados e ela deixa de ocupar uma parada da rota. As demais entregas permanecem acessiveis e ordenadas. | complementa | inferido | Consistencia com operacao de exclusao e rota existente |
| RD06 | O calendario operacional usa o dia da remessa; o fechamento financeiro continua usando o dia efetivo de conclusao. | complementa | inferido | Distincao entre entrega planejada e historico financeiro previamente solicitado |

## Limites e duvidas

- Nao ha autorizacao nesta interpretacao para apagar entregas historicas nem unir destrutivamente remessas legadas.
- A grade reutilizavel deve partir dos horarios existentes; nao inventar novos horarios padrao.
- Recorrencia nao implica copiar clientes, valores ou entregas de outro dia.
- Se houver duas remessas antigas no mesmo dia/horario, preservar todas as entregas; evitar criar uma terceira e tratar a apresentacao sem perda de dados.
- RD05/RD06 sao inferencias de consistencia apresentadas para a implementacao, nao novas decisoes humanas registradas.

## Aceite de produto proposto

1. Trocar entre dois dias conserva a grade de horarios e mostra somente as entregas do dia selecionado.
2. Repetir acesso/cadastro do mesmo dia e horario nao cria outra remessa.
3. Uma entrega de ontem nao aparece como entrega de hoje, mesmo se concluir hoje; nesse caso, o fechamento financeiro contabiliza hoje.
4. Exclusao pela loja remove entrega/link e libera sua posicao na rota sem remover as demais entregas.
5. Usuario sem perfil de loja nao ganha permissao de excluir, e perfil explicitamente inativo permanece bloqueado.

## Handoff parcial SIM → CIM

Artefato sim-change-context-remessas-diarias: draft; produtor SIM; classificacao esperado; fonte solicitacao atual via CIM. Escopo RD01–RD06; destino FIO para implementacao e validacao independente. Nao declara implementacao concluida. Notas Obsidian atualizadas: nenhuma. Pendencias: vault ausente, validacao posterior AS-IS por DIO, regras efetivamente publicadas ainda nao verificadas.
