# Google Maps
Ciclo google-maps-20260929. CIM1.0.1/FIO1.2.1 fontes canônicas previamente lidas, nova demanda.
Pedido: migrar integração GoogleMaps e usar lobo existente🐺 no motoboy. Pergunta chave: usuário não tem, autorizou deixar integração preparada.
- [x] REQ01 SDK GoogleMaps configurável semkey: estado indisponível honesto, nenhum uso da chave Firebase para Maps.
- [x] REQ02 Mapas destino/GPS/editor com polígonos e taxas preservadas; motoboy🐺.
- [x] REQ03 Endereço GoogleGeocoding somente Uberaba/MG, rejeitar centroids/parciais/late results.
- [x] REQ04 Rotas GoogleRoutesAPI na ordem usuário, origem fixa e paradas preservadas.
- [x] TASK01 loader/config/search root, REQ01/03.
- [x] TASK02 routes/payment_scope REQ04.
- [x] TASK03 components/delivery_map REQ02.
Baseline101/101. ConfIA independente tracking_validation. DIO reanálise após validação. Vault ausente segue parcial; ciclo anterior zonas tecnicamente validado, DIO agente indisponível por limite, não declarada confirmaçãoASIS.
Não escopo: adquirir chave/ativarbilling/deploy, redesenhar zonas, tráfegoGPS inventado, logo inexistente distinto do🐺 observado.
Stack Angular20.2/TS5.9/Firebase12; SDK JS direto oficial lazy loaded semdependência. Config browser pública com restrição referrers+APIs documentada. Leaflet retirada do runtime do mapa.
Docs oficiais load-maps-js-api,geocoding,reference/route. Critérios testes: errosemkey,loader único/falha/retry,abort e search cidade,routeordered/chunk/durations, marker🐺/cleanup/destruction/editor invariants.

## Ampliação autorizada
Usuário forneceu chave de navegador e pediu configurarGoogleMaps, trajeto comGPS/ETA e perfilMotoboyParceiro+5estrelas. Chave nunca reproduzida no plano.
- [x] REQ05 Rota Google atual a partir deGPS fresco, Polyline e ETA/cancelamento/throttle60s; sem apresentar rota direta como tempo incluindo outrasparadas.
- [x] REQ06 Perfil visual🐺MotoboyParceiro★★★★★ sem notas/reviews inventadas.
- [x] TASK04 LiveRouteService/payment_scope e tracking/controller/map/delivery_map, contratos separados; REQ05/06.
Limite externo: browser action não executada por revisão automática falhou usage-limit; não burlar, testes offline. APIs/billing/restrições reais da chave não verificáveis neste ambiente.
Validação técnica final: npm.cmd run test:features 118/118, build produção aprovado. Integração real com Google Cloud e inspeção visual pendentes por limite da revisão automática; nenhum dado real alterado para testar.

