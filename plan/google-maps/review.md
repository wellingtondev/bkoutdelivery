# ConfIA — Google Maps

Ciclo google-maps-20260929. Parecer inicial **APROVADO no escopo preparado sem chave**, agora SUPERADO pela extensao de GPS/trajeto/ETA/cartao parceiro. Revisao final da extensao em andamento; nao usar a aprovacao inicial para declarar o novo escopo validado. Revisor nao participou da implementacao.

Executado independentemente `node --test tests/*.test.cjs`: **110/110 aprovados**. Build e visual sao evidencias da coordenacao, nao execucoes deste revisor.

## Revisao dos contratos

- Loader: carregamento sob demanda, uma promise compartilhada, ausencia de chave rejeitada sem inserir script, timeout/erro permitem nova tentativa. Cancelamento ignora resultado tardio; nao afirma cancelar requisicao Google remota.
- Geocoding: biblioteca geocoding/Geocoder; componentRestrictions e verificacao posterior de cidade Uberaba, MG e BR; rejeita partial_match/centroide/coordenadas invalidas. Sem resultado retorna null; erro nao vira endereco ficticio.
- Routes: biblioteca routes/Route.computeRoutes, mascara legs.durationMillis, ordem preservada e optimizeWaypointOrder=false. Lotes de ate 25 intermediarios mais destino preservam continuidade na origem seguinte, sem migrar para Directions legado. Origem621 e pausa entre entregas permanecem. Resposta incompleta ou duracao invalida bloqueia previsoes; cancelamento antes/depois de chamadas protege aplicacao de resultado tardio.
- Mapas: bibliotecas maps/marker e AdvancedMarkerElement, mapId configuravel, gmpDraggable e dragend; motoboy representado por 🐺. Destino/GPS/zonas conservam suas coordenadas. Listeners, overlays e observers sao removidos ao destruir; carregamento tardio nao monta componente destruido.
- Editor: rascunho independente, cancelamento sem salvar, arrastar/desfazer/limpar preservados. Regras geometricas e cobranca10/12/15 continuam nos helpers existentes, sem recalculo historico.

## Conferencia com documentacao primaria

Contratos conferidos em 29/09/2026:

- [Routes Data](https://developers.google.com/maps/documentation/javascript/reference/route): computeRoutes retorna routes; intermediates aceita ate25; legs mantem sequencia dos waypoints; durationMillis esta em milissegundos e requer fields.
- [Geocoding Service](https://developers.google.com/maps/documentation/javascript/geocoding): Geocoder e filtros componentRestrictions.
- [Advanced Markers](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers): AdvancedMarkerElement e contrato de arraste.

## Limites

Nao houve chave, faturamento, autorizacao real Google, mapa online, Geocoding real ou Routes real exercitados nesta revisao. Testes sao mocks de contratos, nao certificacao de integracao remota. Necessario configurar APIs/chave restrita/mapId conforme documentacao local e validar em navegador autorizado antes de afirmar funcionamento real. Sem chave, mapa e busca/rota ficam indisponiveis de forma explicita, conforme decisao humana de deixar preparado.

Nao resolve limites anteriores de regras Firebase publicadas/Obsidian ausente. Aprovacao habilita handoff documental DIO, nao declara deploy nem promove automaticamente AS-IS remoto.

## Revisao final do escopo ampliado

Parecer: **conditional** para o ciclo completo; codigo e contratos offline aprovados, validacao visual e Google real pendentes pelo bloqueio externo abaixo. Nenhum defeito bloqueante identificado na leitura independente. A chave foi configurada pela coordenacao; o valor nao foi lido/reproduzido pelo revisor.

| Requisito | Cenarios e evidencias revisados | Estado |
|---|---|---|
| REQ01/03 | Loader unico/erro/abort, Geocoder cidade e resultados tardios; google-maps/address-search tests | aprovado offline |
| REQ02 | Maps/marker lobo/editor lifecycle, zonas preservadas; delivery-map/editor tests | aprovado offline |
| REQ04 | Route.computeRoutes ordem, lotes, durations e origem; route-estimator tests | aprovado offline |
| REQ05 | LiveRouteService so envia coordenadas, valida path/duration/distance e ignora resposta apos abort; live-route tests | aprovado offline |
| REQ05 | TrackingRouteController limita chamadas a60s, preserva pedido em andamento entre ticks GPS, cancela GPS antigo/troca token/destino/destroy; tracking-live tests | aprovado offline |
| REQ05 | ETA direta excluida nas paradas posteriores; legenda avisa trecho direto parcial; erro remove rota anterior; polyline removida quando invalida/ausente | aprovado por testes e leitura |
| REQ06 | Cartao Motoboy Parceiro/lobo e estrelas declaradas decorativas, sem quantidade/nota de avaliacoes inventadas | aprovado por leitura; visual pendente |

LiveRouteService usa Route.path com coordenadas numericas LatLngAltitude conforme contrato oficial consultado, mascara path/durationMillis/distanceMeters e TRAFFIC_AWARE. GPS fresco e status OUT_FOR_DELIVERY controlam exibicao; rota/ETA removidos na perda de elegibilidade. ETA posterior mantem previsao salva e nao apresenta linha direta como percurso com todas as visitas. A frase antiga sobre ausencia de transito foi removida pelo implementador.

Reexecucao independente da suite integrada apos extensao: `node --test tests/*.test.cjs`, **118/118 aprovados**, zero falhas. Sem alteracao de implementacao ou testes pelo revisor. Build informado pelo implementador, nao executado novamente aqui.

**Pendencia externa obrigatoria para afirmar validacao completa:** revisao automatica rejeitou a acao de navegador por limite de uso segundo a coordenacao. Nao houve tentativa de contorno. Assim, comparacao visual renderizada, APIs/billing/referrers reais da chave e trafegoGoogle real continuam desconhecidos. Responsavel: coordenacao/usuario quando browser estiver disponivel; encerramento exige carregar mapa, observar lobo+cartao, calcular rota/ETA e conferir estados responsivos/erros com configuracao autorizada. Nao rotular esta parte como validada no handoff DIO.
