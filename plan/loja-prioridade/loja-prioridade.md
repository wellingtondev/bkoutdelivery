# Loja e prioridade

Ciclo loja-prioridade-20260929. Fonte pedido usuario viaCIM; SIM parcial em sim.md. Vault ausente.

Confirmado: acoes responsivas Tracking/Pago/Excluir/Editar; prioridade R$10 aceita/recusada pelo entregador com estado no acompanhamento; WhatsApp substitui SMS.
Entrevista pendente ja enviada pela coordenacao: cobrar somente apos aceite? Qual numero completo e modoWhatsApp (deep-link com envio humano ou API automatica)? Nao implementar dependencias por suposicao.

- [ ] REQ01 Acoes responsivas da loja incluindo Editar.
- [ ] REQ02 Edicao persistente coerente com identidade/privacidade preservadas.
- [ ] REQ03 Prioridade R$10, aceite/recusa e estado tracking; pendente cobranca.
- [ ] REQ04 WhatsApp substitui SMS; destinatario/modo pendentes.
- [ ] TASK01 UI loja; task01.md; REQ01/02; autorizado parcial.
- [ ] TASK02 Persistencia edicao; task02.md; REQ02; autorizado parcial.
- [ ] TASK03 Prioridade/WhatsApp; REQ03/04; bloqueada por decisoes materiais.

Preservar Angular/Firebase/testes existentes. Coordenacao registra baseline atual e contratos antes de implementar. ConfIA revisa edicao, erros, concorrencia, privacidade e responsividade; nao alegar envioWhatsApp/escrita remota em testes offline. Navegador segue restricoes observadas, sem contornar revisao automatica.
