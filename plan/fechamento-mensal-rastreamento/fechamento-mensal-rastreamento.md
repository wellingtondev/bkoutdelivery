# Fechamento mensal e rastreamento

Cycle ID: fechamento-mensal-rastreamento-20260926
Status: implementado e validado localmente em 2026-09-26; publicacao de regras e validacao Firebase/GPS fisico pendentes. Fechamento documental CIM parcial (vault nao informado).
Origem: usuario solicita CIM, calculo mensal das entregas realizadas, calendario de fechamento, endereco exato no cadastro e acompanhamento em tempo real com visual melhorado.

## Escopo proposto

- [x] REQ-01: painel da loja com resumo mensal e calendario diario das entregas concluidas — validacao.md, testes mensal e navegador.
- [x] REQ-02: cadastro de endereco com coordenadas confirmadas para destino — validacao.md, testes servico e navegador.
- [x] REQ-03: tracking por token com mapa real, destino e posicao do entregador compartilhada durante entrega ativa — validado localmente com mocks GPS/Firebase; uso remoto depende publicacao de regras e permissao GPS.
- [x] REQ-04: atualizar visual do tracking e apresentar estados honestos de carregamento, permissao, ausencia e desatualizacao de GPS — navegador desktop/mobile e revisao independente.

## Descoberta

Confirmado: quantidade, valor dos pedidos e taxas separados, pela conclusao efetiva no mes. Pergunta: "No fechamento mensal, quais totais voce quer? Vou considerar as entregas efetivamente concluidas no mes e permitir consultar cada dia no calendario." Resposta: "Quantidade, valor dos pedidos e taxas de entrega separados (recomendado)".
Confirmado: pergunta sobre provedor respondida "Marcar destino no mapa, sem busca paga (recomendado para começar)". Implementado Leaflet + tiles OSM com atribuicao, sem geocodificacao. Registros legados sem deliveredAt excluidos dos totais com aviso visivel.
Proposta de privacidade: posicao do entregador apenas mediante ativacao de GPS e durante a entrega; cessar compartilhamento ao concluir/desativar. Nao publicar telefone/endereco textual no tracking.
Vault ainda nao informado no ciclo anterior; consolidacao documental permanece pendente.

## Trabalho anterior em andamento

Cadastro de remessas com data/horario e correcao visual de login concluidos. Cadastro de remessa validado no harness local e login conferido em desktop e viewport 390px sem overflow. Alteracoes preservadas.

## Tasks

- [x] TASK-01 — Resumo mensal/calendario; REQ-01; task01.md; double check root, validacao.md.
- [x] TASK-02 — Destino/mapa/tracking/GPS; REQ-02/03/04; task02.md; double check root, validacao.md.
