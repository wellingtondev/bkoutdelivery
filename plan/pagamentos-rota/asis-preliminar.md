# Reanálise AS-IS preliminar — pagamentos e rota

- ID: `dio-asis-pagamentos-rota-20260926`; ciclo CIM: `pagamentos-rota-20260926`.
- Produtor: DIO 1.0.1; fonte verificada `C:/Users/Pc Gamer/.codex/skills/dio/SKILL.md`.
- Modo: incremental; status do artefato: `current`; resultado da consolidação: `partial`.
- Projeto analisado: Blackout Delivery, `H:/blackout-delivery/blackout-delivery-angular/blackout-delivery`.
- Vault: não informado. Publicação bloqueada; nenhuma baseline remota lida, substituída ou alterada.
- Escopo: reanálise somente leitura do produto implementado após mudança, confrontada com `sim-context.md`, `pagamentos-rota.md` e contexto explícito da conversa. Contratos graph e referências DIO obrigatórios consultados. Este documento local não substitui estado global nem aceite técnico FIO.

## Conhecimento observado por requisito

| Item | Resultado da reanálise | Afirmação material e classificação | Evidência localizável |
| --- | --- | --- | --- |
| REQ-01 / P01-P02 | confirmado no repositório | **observado:** no cadastro de uma entrega pendente a loja escolhe crédito em 1, 2 ou 3 parcelas, débito, Pix ou dinheiro. Observação de até 500 caracteres é disponibilizada à operação privada e exibida ao entregador. Pedido marcado pago dispensa e remove os dados de cobrança. Legados sem método não recebem uma forma inventada. | `src/app/pages/store/store.component.html:75`, `src/app/core/payment.ts:6`, `src/app/core/delivery.service.ts:100`, `src/app/pages/driver/driver.component.ts:53` |
| REQ-02 / P03-P04-P09 | confirmado no repositório | **observado:** entregas abertas são agrupadas por remessa, com expansão individual, de cada grupo ou de todos os grupos. O valor a receber e a forma de pagamento permanecem destacados mesmo com os detalhes recolhidos. As ações de confirmar entrega e iniciar GPS aparecem nos detalhes expandidos. | `src/app/pages/driver/driver.component.ts:24`, `src/app/pages/driver/driver.component.ts:42`, `src/app/core/payment.ts:22` |
| REQ-03 / P05 | confirmado no repositório | **observado:** “Cheguei” abre o WhatsApp do telefone cadastrado com saudação personalizada, identificação BlackOut Shop Brazil e emojis indicando chegada. O aplicativo informa que o envio deve ser confirmado no WhatsApp; não confirma envio automático. Telefone fora do formato brasileiro aceito produz aviso de indisponibilidade. | `src/app/core/driver-actions.ts:3`, `src/app/pages/driver/driver.component.ts:58` |
| REQ-04 / P06-P07 | parcial quanto à definição de produto; comportamento observado | **observado:** o entregador organiza as paradas entre remessas por setas e salva a sequência; salvar vincula as entregas selecionadas ao entregador. O link de cada cliente apresenta somente a posição da própria entrega. A conclusão remove a parada da sequência e atualiza as posições restantes. **observado:** existe previsão opcional de data e hora, informada manualmente pelo entregador, com indicação pública de estimativa sujeita a mudanças. Horário vencido aparece como previsão em atualização. **a_confirmar:** escolha humana entre previsão manual e somente posição permanece sem resposta explícita ao questionário. | `src/app/pages/driver/driver.component.ts:32`, `src/app/core/delivery.service.ts:143`, `src/app/core/delivery.service.ts:176`, `src/app/pages/tracking/tracking.component.html:27` |
| REQ-05 / P08 | confirmado no repositório e regra confirmada pelo usuário | **observado:** histórico pessoal mostra taxas das entregas concluídas pelo próprio entregador hoje, segundo a data de conclusão no horário de Brasília. Valores somados em centavos; entregas sem vínculo pessoal ou data válida não entram. O indicador explicita que não significa repasse já pago. | `src/app/components/driver-history/driver-history.ts:17`, `src/app/components/driver-history/driver-history.component.html:6` |

“Confirmado no repositório” nesta tabela representa correspondência de conhecimento esperado com evidência observável durante a DIO. Não significa aprovação técnica final, comprovação de implantação remota, envio real de mensagem ou aceite humano de todos os detalhes.

## Confronto e decisões

1. **confirmado:** o usuário respondeu “Sim, usar essas duas regras” à composição da cobrança por pedido mais taxa e ao total diário por taxas concluídas sem representar repasse. A cobrança exibida e o indicador pessoal observados correspondem a essa decisão; fontes: resposta humana da conversa e evidências REQ-02/05.
2. **inferido:** “incluir uma remessa”, no pedido, se refere ao cadastro da entrega que pertence à remessa. A observação, pagamento e telefone permanecem individuais. A inferência registrada como P10 na SIM é compatível com a implementação; não há nova confirmação humana registrada.
3. **observado quanto à decisão de implementação; a_confirmar quanto à preferência humana:** a coordenação implementou previsão manual opcional após o usuário reiterar o pedido de funcionalidade. Esta foi uma decisão de implementação informada, não uma resposta explícita à pergunta “manual ou somente posição”. O texto SIM que mantém a preferência pendente deve ser reconciliado pela coordenação sem fabricar uma resposta. Não existe cálculo automático de duração da rota observado.
4. **observado:** o cadastro público de acompanhamento não recebe observações, telefone ou dados de cobrança detalhados da entrega. A ordem pública revela a posição própria, sem listar nomes ou endereços de outras paradas. Evidências: `src/app/core/delivery.service.ts:103`, `src/app/core/delivery.service.ts:215`.

## Limites e pendências

- **observado documentalmente:** ao concluir esta reanálise, `entrega.md` passou a registrar validação FIO local, revisão independente, 60/60 testes, build e visual390px. Esses resultados são reportados pela FIO; DIO não executou esses testes nem assume o papel de aprovação técnica final.
- **a_confirmar:** execução em Firebase real, permissões efetivamente publicadas, persistência remota em uso, entrega de mensagem WhatsApp e disponibilidade nos dispositivos do usuário. A existência do fluxo local não prova esses eventos.
- **bloqueado:** publicação Obsidian e reconciliação com baseline remota, pois não há caminho de vault fornecido. Preservação significa que nenhuma nota remota foi alterada; não significa leitura ou aprovação de notas desconhecidas.
- Estado global DIO/CIM continua sob responsabilidade da coordenação, conforme escopo delegado. Nenhum código ou estado global foi alterado nesta fase.

## Handoff parcial à CIM

Origem DIO, destino CIM `pagamentos-rota-20260926`; resultado `partial`. REQ-01/02/03/05 possuem evidência AS-IS observada correspondente ao esperado. REQ-04 possui ordem e previsão manual observáveis, mas preserva a distinção entre decisão de implementação e preferência humana ainda não respondida. Baseline remota preservada sem publicação. Retorno necessário: coordenação reconciliar a decisão de previsão na documentação, incorporar a entrega técnica FIO e registrar bloqueio de publicação; não declarar encerramento completo do ciclo Obsidian.
