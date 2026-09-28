# zonas-entrega
Ciclo zonas-entrega-20260928. Fontes CIM1.0.1, SIM1.0.1, FIO1.2.1, DIO1.0.1 canônicas verificadas.

Pedido: taxa automática por destino; verde10, amarela12, fora15.
Entrevista: como delimitar sem escala? Resposta explícita: quero desenhar zonas no mapa da loja. Pedido e resposta autorizam implementação, sem nova confirmação.
Decisões técnicas: dois polígonos válidos, verde contida na amarela; bordas inclusivas verde prioritária. Configuração compartilhada settings/deliveryZones, STORE leitura/escrita. Sem configuração preserva manual; erro de leitura bloqueia cadastro para não cobrar valor errado. Depois de configurado taxa automática não editável; alteração de endereço limpa taxa anterior até destino resolvido. Criação reconsulta configuração e recalcula, histórico imutável.
Não escopo: inventar fronteiras da imagem, configurar produção sem desenho do usuário, publicar Firebase sem autenticação, migrar taxas históricas. Vault ausente: documentação parcial local.

- [x] REQ-01 Editor de polígonos verde/amarelo em mapa Uberaba, desfazer/limpar e salvar compartilhado.
- [x] REQ-02 Calcular10/12/15 com bordas e validação; taxa sincronizada busca/marcador/cadastro.
- [x] REQ-03 STORE-only configuração; erro/carregamento explícitos, histórico preservado.
- [x] TASK-01 Domínio/persistência/validação — task01.md — REQ02/03
- [x] TASK-02 Editor/mapa — task02.md — REQ01
- [x] TASK-03 Integração loja/fixture — task03.md — REQ01/02/03

Stack observado Angular20.2, TS5.9, Firebase12, Leaflet1.9; sem novas dependências. Matriz: TEST01 geometria/bordas/inválidos, TEST02 auth/persistência/recalculo, TEST03 editor/render, TEST04 loja troca destino/stale/loading/manual.

Entrega técnica validada: review.md independente, validation.md101/101/build, visual.md. Limitação externa: publicação regras e configuração real de polígonos pela loja.
