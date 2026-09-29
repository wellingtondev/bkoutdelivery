# SIM — Google Maps

Cycle/request ID: google-maps-20260929. Projeto Blackout Delivery.
Skill: sim 1.0.1, fonte canonica C:/Users/Pc Gamer/.codex/skills/sim/SKILL.md, contratos lidos nesta conversa.
Status draft; resultado partial; conhecimento esperado, sem promocao AS-IS. Vault ausente; nenhuma nota Obsidian publicada.

## Origem e decisao

Solicitacao do usuario encaminhada pela CIM: utilizar Google Maps consumindo a API e representar o motoboy com o lobo da identidade da marca (🐺). Usuario confirmou que ainda nao possui chave e quer deixar a integracao preparada. Nao implica servico externo configurado, faturamento habilitado ou chamadas reais aprovadas com credenciais inexistentes.

## Conhecimento esperado

| ID | Comportamento | Impacto | Certeza | Origem |
|---|---|---|---|---|
| GM01 | Mapas de destino, acompanhamento e desenho de zonas usam Google Maps quando configurado. | altera | confirmado | Pedido e escopo encaminhados pela CIM |
| GM02 | O marcador de motoboy usa o lobo da identidade existente. | altera | confirmado | Pedido do usuario |
| GM03 | Busca de endereco usa Google Geocoding, mantendo restricao a Uberaba e ajuste manual do destino. | altera | confirmado | Escopo CIM |
| GM04 | Calculo de percurso usa Google Routes API, preservando ordem das entregas e origem existente no numero 621. | altera | confirmado | Escopo CIM; sem inventar reordenacao |
| GM05 | Sem chave, a integracao fica preparada com orientacao de configuracao e estado indisponivel explicito, sem aparentar mapa/rota funcional. | complementa | confirmado | Resposta humana sobre ausencia de chave |
| GM06 | Zonas e taxas R$10/R$12/R$15, dados historicos e compartilhamento de GPS permanecem preservados. | complementa | confirmado | Escopo CIM |

## Aceite proposto

1. Configuracao local documentada para APIs novas solicitadas; nao depender de API de rotas legada.
2. Ausencia de chave e falhas de carregamento/consulta resultam em mensagens honestas, sem resultados ou previsoes inventados.
3. Busca mantem Uberaba, origem/ordem da rota sao preservadas e resultado corresponde aos destinos atuais.
4. Destino e desenho manual das zonas preservam coordenadas e regras de cobranca; nenhuma migracao recalcula historico.
5. Posicao do motoboy continua condicionada ao GPS compartilhado e atual, usando identidade de lobo.

## Handoff parcial SIM → CIM

### Extensao confirmada durante o ciclo

Usuario forneceu chave, registrada apenas na configuracao pela coordenacao (valor nunca reproduzido neste artefato), e ampliou pedido para trajeto/ETA Google a partir do GPS recente e cartao **Motoboy Parceiro** com lobo e cinco estrelas decorativas. Impacto novo; certeza confirmado conforme instrucao CIM. Nao existe nota de avaliacao nem quantidade de clientes a inferir dessas estrelas.

Conhecimento esperado GM07: durante GPS recente, calcular linha de rota e estimativa pelo Google com intervalo minimo de 60s; cancelar aplicacao de resultados obsoletos quando pedido/destino/estado muda. GM08: somente a proxima parada usa ETA direta GPS→destino; outras preservam previsao salva e identificam linha como trajeto parcial sem representar visitas intermediarias. GM09: falhas/posicao antiga/conclusao removem aparencia de trajeto atual, sem inventar previsao.

Disponibilidade real continua a_confirmar: chave configurada nao prova APIs/faturamento/restricoes corretas. Validacao browser foi bloqueada pela revisao automatica por limite de uso, segundo coordenacao; nao contornar nem declarar validacao Google real.

Artefato sim-change-context-google-maps; produtor SIM; status draft; classificacao esperado. Fonte pedido e resposta do usuario encaminhados pela CIM. Historico anterior preservado em plan/zonas-entrega/sim.md; limitacoes DIO do ciclo anterior nao sao encerradas por esta mudanca. Implementacao e validacao ficam com FIO; consolidacao AS-IS posterior com DIO. Pendencias: chave/API/faturamento nao configurados, comportamento real do Google nao exercitado, vault ausente.
