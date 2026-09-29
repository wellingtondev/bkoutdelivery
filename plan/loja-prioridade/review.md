# ConfIA parcial — loja-prioridade-20260929

Estado: revisao em andamento, nao aprovada. Nenhuma implementacao editada pelo revisor.

## Achado inicial P2

updateDelivery nao valida status DELIVERED antes de atualizar orderValue e, com destino alterado, deliveryFee. Entrega concluida pode ter valores do fechamento historico alterados. Correcao sugerida: bloquear edicao concluida dentro da transacao e UI, incluindo conclusao concorrente; ou contrato explicito para preservacao dos campos financeiros/destino em concluidas. Responsavel coordenacao/CodIA, ja notificado.

## Cenarios necessarios alem dos dois testes iniciais

- STORE ativo edita privado/publico sem alterar IDs/token/driver/status/deliveredAt; nao vaza telefone/notes.
- Concluida e conclusao concorrente nao alteram fechamento.
- Paid confirmado nao pode ser revertido por formulario antigo.
- Mudar destino recalcula zona/taxa e limpa ETA propria e de peers ativos da mesma rota; peers concluidos/outrodriver preservados.
- Mesmo destino preserva taxa historica mesmo se zonas mudaram.
- Ausente/tracking ausente/profileinativo/negacao commit/trocaUID falham sem gravacao parcial.
- Cancelar formulario e erro nao criam nova entrega; layout das quatro acoes mobile sem overflow (visual pendente disponibilidade browser).

Prioridade continua bloqueada por cobranca e numeroWhatsApp; deep-link ja confirmado segundo CIM. Nao afirmar validacao de REQ03/04 ainda.
Revisão final posterior: guardconcluída e pagamento concorrente presentes; destino invalida peers. Revisão cruzada delivery_map favoráveloffline, ver ../clientes-mapa/review.md. Suiteintegrada134/134/buildaprovados. Prioridade seguependente.
