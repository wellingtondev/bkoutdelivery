# SIM — Loja e prioridade

Ciclo loja-prioridade-20260929. Skill sim1.0.1; fonte canonica C:/Users/Pc Gamer/.codex/skills/sim/SKILL.md e contratos lidos nesta conversa. Estado draft, resultado partial; esperado, nao AS-IS. Projeto Blackout Delivery; vault ausente.

Origem: pedido encaminhado pela CIM em29/09/2026: acoes responsivas Tracking/Pago/Excluir e incluir Editar na loja; cliente solicita prioridade R$10; entregador aceita/recusa e acompanhamento informa estado. Canal inicialmente SMS foi explicitamente substituido pelo usuario por WhatsApp.

| ID | Conhecimento esperado | Impacto | Certeza |
|---|---|---|---|
| LP01 | Loja apresenta Tracking/Pago/Excluir/Editar utilizaveis em telas pequenas. | complementa | confirmado via pedido CIM |
| LP02 | Loja edita entrega existente, preservando identidade e coerencia do acompanhamento. | novo | confirmado; preservacao identidade inferida |
| LP03 | Cliente solicita prioridade R$10; entregador aceita/recusa e cliente acompanha estado. | novo | confirmado via pedido CIM |
| LP04 | WhatsApp substitui SMS na comunicacao de prioridade. | altera | confirmado pela correcao usuario |
| LP05 | Momento da cobranca dos R$10 (somente apos aceite ou antes). | duvida | a_confirmar; pergunta enviada pela CIM |
| LP06 | Numero completo destinatario e modo WhatsApp (deep-link com envio humano ou API automatica). | duvida | a_confirmar; pergunta enviada pela CIM |

LP01/LP02 seguem para implementacao parcial autorizada. LP03/LP04 registram intencao, mas dependencias LP05/LP06 permanecem bloqueadas por ambiguidade material: nao assumir cobranca, destinatario ou envio autonomo. Incorporar respostas posteriores neste mesmo registro.

Decisao posterior encaminhada pela CIM: WhatsApp sera deep-link com envio confirmado pela pessoa, sem API automatica. LP06 agora depende somente do numero completo; LP05 cobranca ainda pendente. Esta decisao supera a duvida de modo de envio, sem autorizar mensagem autonoma.

Edicao deve comunicar falha real, preservar dados privados e identidade; arquitetura deve explicitar campos editaveis, pagamento/rota/historico e concorrencia. Pedido ausente nao deve ser recriado silenciosamente. Esses criterios sao inferencias de consistencia para FIO, nao novas decisoes humanas.

Historico anterior preservado em plan/google-maps/sim.md e review.md, incluindo pendencias visuais/API real. Handoff parcial sim-change-context-loja-prioridade: produtorSIM, draft/esperado, fontes pedido/resposta viaCIM; LP01/02 liberados aFIO, prioridade aguardaLP05/06. Nenhuma nota Obsidian publicada ou baseline promovida.
