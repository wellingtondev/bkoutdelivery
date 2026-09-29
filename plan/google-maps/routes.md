# TASK02 — Routes

Ciclo google-maps-20260929. Implementação isolada FIO/CodIA em route-estimator e testes. Sem aprovação independente.

## Contrato

`loadGoogleMaps()` retorna namespace maps; importLibrary('routes') fornece Route.computeRoutes. Request usa origem/destino LatLngLiteral e intermediates como Waypoint com location. Campos solicitados: legs.durationMillis. Conversão de milissegundos para segundos preserva arrivalEstimates e intervalo de três minutos entre clientes.

Até99 destinos são divididos em blocos sequenciais de26 (25 intermediates + destino). Próxima origem é destino anterior, sem otimização de ordem. Primeiro departureTime omitido usa momento do request; demais blocos usam partida futura considerando durações acumuladas e paradas anteriores. O tráfego usa TRAFFIC_AWARE.

Cancelamento envolve loader, import da biblioteca e chamadas de rota, sem retornar resultado parcial após falha. Somente coordenadas são enviadas, sem nome/telefone/pedido. Ausência de chave, falha do Google, trechos ausentes e durações inválidas não inventam previsão.

## Evidências

- Baseline101 informada pela coordenação.
- RED: node --test tests/route-estimator.test.cjs, 1pass/5fail pela implementação antiga ainda usar fetch/OSRM.
- GREEN final: mesmo comando, 7/7 passando, incluindo cancelamento durante import e pre-abort.
- Fonte oficial consultada em29/09/2026: [Routes Data JavaScript reference](https://developers.google.com/maps/documentation/javascript/reference/route). Contratos de Route.computeRoutes, ComputeRoutesRequest e Waypoint verificados.

Não houve chamada real ao Google nem custo: usuário ainda sem chave. Testes de contrato usam doubles da biblioteca. Validação completa depende de chave Google, APIs e faturamento configurados.

## Extensão: rota ao vivo

Usuário forneceu chave à coordenação e ampliou o pedido para rota e previsão durante deslocamento. Novo LiveRouteService retorna path, durationSeconds, distanceMeters, calculatedAt e arrivalTime a partir de Route.computeRoutes. Campos solicitados path/durationMillis/distanceMeters, tráfego DRIVING/TRAFFIC_AWARE. Não simula linha reta em caso de falha. Só coordenadas são copiadas/enviadas, cancelamento preservado em loader/import/request. Throttle pertence à UI do acompanhamento.

RED: `node --test tests/live-route.test.cjs`,3falhas esperadas por arquivo ausente. GREEN após implementação:3/3. Abrange contrato Google, cópia sem dados privados, entrada/retorno inválidos, erros e cancelamento. Sem chamada real nem custo nesses testes.

Formato de Route.path verificado na referência de [LatLngAltitude](https://developers.google.com/maps/documentation/javascript/reference/coordinates#LatLngAltitude), com propriedades numéricas lat/lng.
