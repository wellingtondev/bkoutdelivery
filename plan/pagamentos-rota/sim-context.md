# Contexto esperado da mudança

- Identificador: `pagamentos-rota-20260926`.
- Produtor: SIM 1.0.1, fonte canônica `C:/Users/Pc Gamer/.codex/skills/sim/SKILL.md`.
- Estado: `draft`; resultado `partial`, restrito ao contexto local.
- Origem: solicitação do usuário nesta conversa em 26/09/2026 sobre pagamentos, observações, remessas do entregador, chegada pelo WhatsApp, ordem da rota e taxas diárias.
- Projeto: Blackout Delivery.
- Vault: não informado; publicação e comparação com notas persistentes bloqueadas. Nenhuma nota AS-IS foi criada ou alterada.

## Conhecimento esperado

As afirmações abaixo descrevem o produto solicitado, sem declarar implementação ou aprovação técnica.

| ID | Comportamento esperado | Impacto | Certeza | Evidência |
| --- | --- | --- | --- | --- |
| P01 | Ao cadastrar uma entrega não paga, a loja informa crédito em 1, 2 ou 3 parcelas, débito, Pix ou dinheiro. | complementa | confirmado | Pedido atual explícito. |
| P02 | A loja pode incluir uma observação para o entregador consultar junto da entrega. | novo | confirmado | Pedido atual explícito. |
| P03 | O entregador visualiza as entregas organizadas em remessas e consegue expandir ou recolher todas, facilitando a operação no celular. | altera | confirmado | Pedido atual explícito. |
| P04 | A visualização mantém as ações de confirmar entrega e ativar localização acessíveis. | complementa | confirmado | Pedido atual explícito. |
| P05 | Uma ação “Cheguei” prepara o contato no WhatsApp do telefone cadastrado, com mensagem cordial, identificação BlackOut Shop Brazil e ícones informando que o pedido chegou à porta. | novo | confirmado | Pedido atual explícito; mecanismo exato de envio depende da integração disponível. |
| P06 | O entregador consegue ordenar manualmente suas entregas conforme a rota que planejou no celular. | novo | confirmado | Pedido atual explícito. |
| P07 | O acompanhamento do cliente reflete informação da rota útil para entender a chegada da própria entrega. | complementa | confirmado | Pedido atual explícito; forma de previsão ainda pendente. |
| P08 | O entregador visualiza o valor diário relacionado às taxas de suas entregas. | complementa | confirmado | Pedido atual; definição contábil pendente. |
| P09 | Cada entrega destaca o valor a receber do cliente e a forma de pagamento. | altera | confirmado | Pedido atual explícito; composição do valor pendente. |
| P10 | A expressão “incluir uma remessa” refere-se neste contexto ao cadastro da entrega pertencente à remessa, pois pagamento, cliente e telefone são individuais. | dúvida | inferido | Contexto atual da loja e restante da solicitação. |

## Dúvidas e decisões humanas

As perguntas de esclarecimento já foram abertas pela coordenação; não duplicar perguntas nem consolidar respostas inexistentes.

1. **Cobrança e taxas — confirmado pelo usuário:** valor a receber é pedido mais taxa de entrega. O indicador diário corresponde à soma das taxas das entregas concluídas pelo próprio entregador, sem significar repasse financeiro efetivo. Informação recebida da coordenação do ciclo após a resposta humana.
2. **Previsão:** confirmar horário informado manualmente ou somente posição na sequência. Ordenação não fornece, por si só, tempo de deslocamento ou promessa de horário.

Somente o detalhe da previsão permanece `a_confirmar`. O contexto anterior confirma que histórico e totais do entregador abrangem somente as próprias entregas.

## Impacto e fronteiras

- Cadastro na loja: novos dados de cobrança e instrução operacional por entrega; manter o significado de pedido já pago.
- Operação do entregador: leitura de pagamento e observação, organização de remessas, ordem de execução e acesso ao contato de chegada.
- Histórico pessoal: ampliar a informação diária de quantidade com o indicador de taxas, preservando o critério de conclusão e a exclusão de entregas alheias.
- Acompanhamento público: divulgar somente informação necessária à previsão da própria entrega; telefone do cliente, observação operacional e dados de outros clientes não fazem parte do pedido de publicação.
- WhatsApp: distinguir abrir uma conversa com texto pronto de envio automático confirmado. A solicitação não fornece integração empresarial nem credenciais; não declarar mensagem enviada sem evidência.
- Dados antigos: ausência de forma de pagamento, sequência ou previsão não autoriza inventar informações; apresentar ausência explicitamente quando relevante.

## Contexto consultado e limites

Foram consultadas a solicitação atual, a decisão anterior de histórico pessoal, os registros locais em `plan/historico-entregador/` e as superfícies existentes de cadastro, operação do entregador, histórico e acompanhamento público. A leitura do repositório serve apenas para delimitar os conceitos envolvidos; não constitui revalidação ou promoção de baseline pela SIM.

O conhecimento esperado claro e a decisão financeira confirmada podem orientar a implementação. A definição de previsão precisa de decisão humana antes de consolidar a regra correspondente. A publicação no Obsidian permanece bloqueada por ausência do vault, sem impedir o trabalho local já autorizado.

## Handoff parcial à CIM

Destino: CIM do ciclo `pagamentos-rota-20260926`. Artefato `sim-change-context`, status `draft`. Este handoff preserva o conhecimento esperado, os impactos e as pendências acima; não constitui aceite de implementação, execução FIO concluída, publicação no vault ou confirmação AS-IS. Após respostas humanas, reconciliar este arquivo de modo idempotente e encaminhar as decisões à FIO.
