# Revisão independente das alterações do coordenador

2026-09-29, revisor `/root/delivery_map`. Esta revisão não aprova o componente/helper de clientes, implementados pelo próprio revisor; estes exigem revisão do coordenador.

## Busca e integração Store — revisão estática e testes offline

`address-search.ts` consulta Geocoder com país BR, estado MG e Uberaba. Rejeita partial_match, tipos genéricos como route/locality, outra cidade/UF/país e coordenadas inválidas. Quando extrai número explícito, exige street_number correspondente; retorno ausente ou ZERO_RESULTS permite marcação manual. Número não identificável não é inventado. `node --test tests/address-search.test.cjs`: 4 pass / 0 fail, inclusive número divergente e centro de rua.

Store importa componente e expõe botão Clientes desabilitado em loading/error; input usa exclusivamente deliveries staff, com dataLoading/dataError propagados e fechamento local. Rota loja está sob storeGuard. Nenhum novo caminho público/tracking nem consulta de dados pessoais foi criado na integração. Sem achado bloqueante nos arquivos revisados. Resultado offline favorável; não representa inspeção visual ou chamada Google real.

## Revisão complementar updateDelivery — loja-prioridade

Leitura da transação implementada pelo coordenador: exige perfil STORE ativo, rejeita entrega já DELIVERED antes de gravar e rejeita regressão paid=true para false de formulário desatualizado. Preserva taxa quando coordenadas são iguais; destino alterado recalcula com zonas e invalida estimativas do pedido/pares ativos na mesma transação. Atualiza tracking com whitelist pública, excluindo telefone/notas/pagamento detalhado; status, token, remessa e data não são sobrescritos pela edição. Revalida UID antes das escritas. Leituras antecedem escritas.

`node --test --test-name-pattern='store edit' tests/delivery.service.test.cjs`: 4 pass / 0 fail. Revisão estática/offline favorável aos cenários corrigidos completed/payment concurrency/destination peer ETA. Não valida regras Firebase em produção, SMS/priorização ou visual, que permanecem fora deste parecer.
