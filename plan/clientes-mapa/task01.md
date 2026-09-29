# TASK01 — mapa de clientes

Ciclo clientes-mapa-20260929. Contexto isolado `/root/delivery_map`, escopo delegado components/customer-map, core/customer-locations e tests/customer-map. FIO canônica 1.2.1 já lida nesta sessão. Implementação entregue ao coordenador; validação final independente permanece pendente.

- [x] Contrato implementado: app-customer-map, inputs deliveries/dataLoading/dataError, output closed.
- [x] Implementação: Google Maps JS + AdvancedMarkerElement, 🐺 e nome por textContent; somente entregas DELIVERED com coordenadas válidas; dedup nome normalizado e coordenadas exatas; não expõe telefone/notas; vazio/carregamento/erro; cleanup e resize; lista de nomes acessível; Uberaba inicial e fitBounds.
- [x] Evidência unitária: `node --test tests/customer-map.test.cjs`, 4 pass / 0 fail. Cenários: dedup/filtro/campos mínimos, mock Google texto seguro e cleanup, erro SDK, atualização removendo marcadores em erro staff.
- [x] Validação final independente do componente/mapa real pelo coordenador.

TDD observado: helper passou; 2 testes de componente falharam por ausência do arquivo antes da implementação. Após criação, 3 passaram; cenário adicional de remoção dos marcadores foi incorporado e 4 passaram. `tsc --noEmit -p tsconfig.app.json` passou; compilação inicial ainda precedia importação do componente no Store, portanto coordenador deve rodar build integrado.

Limites: nenhum acesso real ao Firebase ou teste visual/API externa por este agente. Dados vêm exclusivamente do input staff já carregado, sem consultas adicionais pelo componente. Aprovação global reservada ao coordenador.

Validação offline final:134/134 testes, buildprodução aprovado; review.md e dio.md. RenderGoogle real e vault pendentes, não aprovados.
