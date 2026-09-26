# Validacao e evidencia de entrega

Cycle ID: fechamento-mensal-rastreamento-20260926
Data: 2026-09-26. Decisao: aprovada no escopo local; ambiente remoto nao exercitado.
Revisao independente: agente tracking_validation; implementacao root, monthly_summary e delivery_map.

## Evidencias observadas

- `npm.cmd run build`: exit 0, bundle completo. Aviso informativo de Leaflet CommonJS (biblioteca ja instalada); nenhum erro.
- `npm.cmd run test:features`: 32 testes, 32 aprovados, zero falhas. Servico/enderecos/remessas, 9 cenarios de GPS, 5 de fechamento mensal, reconfirmacao sem redatar entrega e regressao dos contratos anteriores.
- REQ-01: harness local mostrou 2 entregas concluidas, R$205,50 de pedidos e R$20,00 de taxas; clique 25/09 mostrou R$120,00/R$8,00; dia 26 mostrou R$85,50/R$12,00. Mes baseado em deliveredAt America/Sao_Paulo, calculo em centavos.
- REQ-02: no harness, nova remessa 19:30 persistiu somente em signal mock e foi selecionada para entrega. Marcacao manual emitiu coordenadas; alterar endereco removeu confirmacao. Botao salvar exige destino e formulario valido.
- REQ-03: 9 testes GPS cobrem claim, escrita so na entrega ativa, stop, confirmada/reassociada, permissao negada, logout/parada/troca de usuario durante inicio. Regras `tracking` revisadas: get permitido, list negado.
- REQ-04: navegador carregou mapa OSM real com destino e posicao de fixture publico (Praca da Se), badge ao vivo, etapas e pedido. Screenshot desktop inspecionado; viewport 390px sem overflow horizontal, mapa com largura 315px. Nao existe linha falsa de rota, ETA inventado ou mapa ilustrativo.
- Login conferido visualmente desktop e em 390px, inputs empilhados com largura300px e sem overflow. Data/horario remessa, estado vazio e erros preservados.
- Logs error na previa apos selecao de destino: vazios.

## Isolamento

`tests/visual/main.ts` usa mocks com banner visivel, routes de componentes reais e nenhum write Firebase. Configuracao Angular test-preview nao e usada por npm run build padrao. Dados de fixture nao foram publicados. GPS real do dispositivo nao foi ativado.

## Limites e acoes externas

- Publicar firestore.rules atualizado no console Firebase antes de usar tracking em producao; arquivo local nao altera regras implantadas.
- Testar com usuario DRIVER em dispositivo real, HTTPS/permissao de GPS, conexao e pagina aberta. Navegador nao garante GPS em segundo plano. Posicoes antigas deixam de aparecer como ao vivo apos45s.
- Sem geocodificacao: endereco digitado e marcador confirmado manualmente pela loja. Mapas/tiles requerem conexao externa; atribuicao OSM presente.
- Entregas antigas sem timestamp de conclusao nao entram nos totais, sem migracao inventada. Entregas antigas sem destino continuam exibindo status com aviso.
- Vault nao informado: SIM/DIO nao publicaram notas, CIM documental parcial. Relatorio preliminar AS-IS local em asis-preliminar.md.

## Double check

Root confrontou escopo confirmado, task01/task02, relatorio independente, 32 testes, build e navegador. Checks locais concluidos. Nenhuma aprovacao remota ou fechamento integral CIM e alegado.
