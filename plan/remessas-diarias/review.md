# Revisao independente — remessas-diarias-20260928

Produtor: ConfIA/tracking_validation. Escopo: leitura de dominio, store, calendario, regras e cadeia transacional de exclusao. Nenhuma implementacao editada pelo revisor.

## Evidencia

Executado `node --test tests/shipment-calendar.test.cjs tests/delivery.service.test.cjs`: 42/42 aprovados.

Confirmado por leitura: representante estavel por horario sem apagar legados; lista/contadores agregam todos IDs historicos do horario somente no dia selecionado; cadastro captura deliveryDate do calendario; fechamento continua deliveredAt. Calendario emite data ao trocar dia/mes/Hoje e mantem selecao na atualizacao dos dados. Regra ativa usa valor padrao para campo ausente, preservando negacao active=false.

Cadeia de exclusao: STORE le perfil/entrega/tracking/manifesto e peers; regras permitem leituras necessarias; delete privado e publico restritos STORE; peers atualizados STORE; manifesto update restrito somente routeEntries. DRIVER nao recebe novo direito de delete publico. Transacao le antes de escrever e verifica mudanca de sessao. Nao houve execucao em Firestore/emulador nem verificacao das regras publicadas.

## Achado encaminhado

P2 — Rotulos de remessa no entregador continuam usando a data historica do documento reutilizado. Com slot criado em 26 e nova entrega deliveryDate=28, agrupamento do driver e historico podem apresentar Remessa 26 para a entrega de 28. A mudanca para horario recorrente torna essa data obsoleta para novas entregas. Corrigir rotulo para horario diario ou agrupar/exibir dia operacional da entrega. Coordenador informado; revisao final condicionada a tratamento ou registro explicito deste impacto.

Tratamento autorizado pelo coordenador: este revisor passou a implementar somente a correcao do achado (a revisao desse diff pertence ao root). Driver agora agrupa por dia operacional + horario, preservando todas as entregas abertas, inclusive atrasadas; IDs legados do mesmo horario/dia sao agregados sem duplicar pedidos. Historico rotula apenas o horario da remessa dentro do calendario de conclusao, evitando data original obsoleta. Testes `driver-groups.test.cjs` + `driver-history.test.cjs`: 10/10 aprovados, com tres regressões novas para dias distintos, IDs legados e fronteira Sao Paulo. Parecer do restante: aprovado no escopo offline; correcao do achado aguardando revisao do root.

## Limites

Sem teste visual independente, sem deploy de regras, sem dados remotos. Nao prova ausencia de documentos duplicados historicos; a implementacao preserva documentos e deduplica a apresentacao. Data legada segue decisao de arquitetura atual: createdAt em Sao Paulo antes de shipment.date, divergindo da inferencia inicial SIM RD06 sobre dia da remessa; nao tratar essa inferencia inicial como decisao humana.
