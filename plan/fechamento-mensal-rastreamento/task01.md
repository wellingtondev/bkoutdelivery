# TASK-01 — Fechamento mensal
Cycle ID: fechamento-mensal-rastreamento-20260926
REQ-01 confirmado pelo usuario.
Escopo: componente Angular standalone de resumo mensal e calendario, utilitario puro, testes Node. Somente arquivos novos financial-summary/monthly-summary sob src/app e tests correspondentes.
Contrato: recebe array Delivery, considera status DELIVERED com deliveredAt Timestamp Firestore/toDate ou seconds, ISO/Date; coordenador adicionara deliveredAt ao modelo. Moeda em centavos, calendario America/Sao_Paulo, mes navegavel e clique dia abre lista. Pedidos e taxas separados. Legados sem data de conclusao excluidos com aviso visivel.
- [x] Arquitetura: tarefa independente do mapa; componente @Input deliveries e agregacao pura.
- [x] Testes: fronteira de mes/fuso, leap year, centavos, pendentes excluidos, timestamp ausente — 5 cenarios em monthly-summary.test.cjs aprovados.
- [x] Implementacao — agente monthly_summary, componente e utilitario isolados; integracao root.
- [x] Revisao/validacao — tracking_validation e navegador root, validacao.md; double check concluido.
