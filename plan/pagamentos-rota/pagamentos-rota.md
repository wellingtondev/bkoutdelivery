# pagamentos-rota
Ciclo: pagamentos-rota-20260926. FIO 1.2.1. Estado: descoberta parcial; pedido autoriza implementação dos itens claros.
## Entrevista
1. Cobrança = pedido + taxa; ganhos = taxas das entregas próprias concluídas hoje, sem afirmar repasse? Resposta: Sim, usar essas duas regras.
2. Previsão manual por entrega ou apenas posição? Sem resposta específica; usuário reiterou integralmente o pedido. Decisão de implementação informada: horário manual OPCIONAL, sem cálculo automático; sem horário mostra apenas posição.
## Requisitos
- [x] REQ-01 Pagamento pendente: crédito 1x/2x/3x, débito, Pix, dinheiro; observação privada disponível ao entregador.
- [x] REQ-02 Entregador agrupa por remessa, expande/recolhe todas e cada entrega; cobrança destacada; preservar confirmar/GPS.
- [x] REQ-03 Cheguei abre WhatsApp do telefone cadastrado com mensagem amigável e emojis; envio final no WhatsApp, sem integração paga ou envio autônomo.
- [x] REQ-04 Ordem persistente definida pelo entregador e informação ao cliente sem expor outros pedidos. Previsão manual opcional futura até 7 dias; exibição Brasília, expirada pede atualização.
- [x] REQ-05 Taxas das próprias entregas concluídas hoje, fuso São Paulo, somadas em centavos.
## Tasks
- [x] TASK-01 pagamento e observações — task01.md — REQ-01
- [x] TASK-02 operação do entregador e taxas — task02.md — REQ-02/03/05
- [x] TASK-03 persistência da rota e tracking — task03.md — REQ-04
## Arquitetura
Angular standalone, Firebase SDK, Leaflet, testes node:test + TS transpile. Compatibilidade com legados sem método: indicar não informado. Observação/telefone nunca publicados no tracking. Campos opcionais PaymentMethod CREDIT/DEBIT/PIX/CASH, installments 1/2/3, notes string, routeOrder number. Não inventar estimativas.
## Evidências
Baseline: npm.cmd run test:features, 43/43 em 26/09/2026 antes desta mudança.
## Limitações
Vault ausente: SIM/DIO locais preliminares, publicação Obsidian pendente. Sem envio real WhatsApp nem escrita Firebase real durante testes.

## Encerramento técnico
ChefIA: requisitos e tasks conferidos com revisao.md aprovada,60testes verdes,build aprovado e visual.md. Entrega local validada. Publicação Obsidian pendente por vault ausente, sem bloquear aplicação do código.
