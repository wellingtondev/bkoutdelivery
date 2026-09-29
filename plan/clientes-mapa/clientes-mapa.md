# Clientes no mapa
Ciclo clientes-mapa-20260929, CIM1.0.1/FIO1.2.1. Pedido explícito: Google Maps na loja/zonas, precisão endereço com número e botãoClientes com lobo+nome onde entregue. Maps já migrado; preservar configuração.
SIM local parcial: observado Google existente; esperado mapa histórico privadoSTORE, somenteconcluídas com coordenadas válidas; dedup mesmo nome/posição; não criar endereço nem publicar tracking adicional. Inferência declarada usuário na commentary: pontos entregasconcluídas. Vaultausente mantém publicação bloqueada.
- [x] REQ01 Busca Google confere número quando identificável e rejeita centrodeRua como residência.
- [x] REQ02 BotãoClientes mapaGoogle com lobos/nomes, vazio/erro/loading e responsividade.
- [x] TASK01 Componente/helper/testes delivery_map; task01.md.
- [x] TASK02 Integração e busca root; task02.md.
Ciclo loja-prioridade preservado: edição128tests/buildok, prioridade depende número/cobrança. Revisãoagenteindependente indisponível porlimite; não inventarvalidação visual.

Validação offline final:134/134 testes, buildprodução aprovado; review.md e dio.md. RenderGoogle real e vault pendentes, não aprovados.
