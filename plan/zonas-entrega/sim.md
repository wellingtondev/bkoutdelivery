# Contexto SIM — zonas de entrega

Cycle/request ID: zonas-entrega-20260928. Projeto: Blackout Delivery.
Produtor: SIM 1.0.1; fonte canonica verificada nesta conversa: C:/Users/Pc Gamer/.codex/skills/sim/SKILL.md.
Estado: draft; resultado partial; conhecimento esperado, sem promocao AS-IS.
Origem: pedido do usuario e resposta explicita encaminhados pela CIM em 28/09/2026.
Vault nao informado: comparacao/publicacao Obsidian pendentes. Historico anterior preservado em plan/remessas-diarias/sim.md.

## Solicitacao e decisao humana

O usuario solicita taxa automatica conforme o destino: dentro da zona verde R$ 10, dentro da amarela R$ 12 e alem da amarela R$ 15. Para definir fronteiras, respondeu explicitamente: **"Quero desenhar as zonas no mapa da loja"**. Essa resposta autoriza o desenho manual pela loja; nao fornece coordenadas, nao autoriza inferir fronteiras da imagem nem estabelece poligonos concretos.

## Conhecimento esperado e impactos

| ID | Regra/fluxo esperado | Impacto | Certeza | Evidencia |
|---|---|---|---|---|
| ZE01 | A loja desenha os limites verde e amarelo no mapa e salva uma configuracao compartilhada para os cadastros seguintes. | novo | confirmado | Resposta explicita sobre desenho; escopo compartilhado encaminhado pela CIM |
| ZE02 | Um novo destino dentro do limite verde recebe taxa de R$ 10. | altera | confirmado | Pedido do usuario |
| ZE03 | Fora do verde, mas dentro do contorno amarelo, a taxa e R$ 12. Fora do amarelo e R$ 15. | altera | confirmado | Pedido do usuario; amarelo externo definido no escopo CIM |
| ZE04 | Ajustar o destino no mapa ou aceitar o ponto da busca de endereco recalcula a taxa no novo cadastro. | complementa | confirmado | Escopo encaminhado pela CIM |
| ZE05 | Na borda verde ou em sobreposicao, prevalece a zona verde; a borda amarela pertence a zona amarela. | complementa | inferido | Criterio de implementacao encaminhado pela CIM; nao apresentado como coordenadas escolhidas pelo usuario |
| ZE06 | Somente a loja administra as zonas; outras sessoes da loja recebem a configuracao compartilhada. | novo | confirmado | Escopo STORE-only encaminhado pela CIM |
| ZE07 | Alterar zonas nao recalcula taxas de entregas ja cadastradas nem seus totais historicos. | complementa | confirmado | Escopo de preservacao historica encaminhado pela CIM |
| ZE08 | Sem configuracao, permanece o cadastro manual de taxa atual, com explicacao para configurar as zonas. Configuracao invalida ou erro de carregamento nao significa destino fora da zona. | complementa | confirmado | Escopo de fallback encaminhado pela CIM |

## Aceite proposto

1. Salvar dois contornos validos desenhados pela loja; nenhum limite ficticio predefinido.
2. Destino verde, faixa amarela e exterior recebem respectivamente R$ 10, R$ 12 e R$ 15.
3. Mover destino entre areas atualiza taxa; o cadastro usa o ponto atual, incluindo ajustes apos busca.
4. Bordas/sobreposicao seguem precedencia verde; amarelo e contorno externo.
5. Sem configuracao, informar ausencia e manter taxa manual. Erro ou geometria invalida nunca dispara automaticamente R$ 15.
6. Reabrir a loja ou outra sessao autorizada recupera configuracao salva; entregador nao pode altera-la.
7. Entregas existentes mantem suas taxas apos edicao das zonas.

## Limites e pendencias

- Nenhum poligono foi fornecido ou inventado nesta interpretacao. O usuario deve desenhar os limites reais na funcionalidade pronta.
- A imagem nao e fonte de coordenadas nem escala geografica confiavel.
- Nao inclui recalculo retroativo, preco por quilometro, zona baseada em tempo de rota ou novas taxas adicionais.
- Validacao de permissao e persistencia real, bem como promocao AS-IS, pertencem as etapas seguintes. Regras publicadas ainda nao foram verificadas neste ciclo.
- Vault ausente bloqueia somente consolidacao Obsidian; este artefato local nao declara publicacao.

## Handoff parcial SIM → CIM

Artefato: sim-change-context-zonas-entrega. Produtor SIM; status draft; classificacao esperado. Escopo ZE01–ZE08; fontes pedido e resposta humana encaminhados pela coordenacao. Destino FIO para implementacao, testes e revisao independente. Notas Obsidian atualizadas: nenhuma. Nenhuma baseline atual substituida. Historico do ciclo e decisao humana preservados neste registro.
