# Remessas diárias
Ciclo remessas-diarias-20260928; CIM1.0.1 SIM1.0.1 FIO1.2.1 DIO1.0.1 canônicas lidas nesta conversa.
Pedido autoriza implementação. Vault ausente: publicação documental parcial, sem bloquear código.
- [x] REQ01 Horários existentes recorrentes, um cartão por horário; preservar todos documentos históricos.
- [x] REQ02 Calendário seleciona dia operacional das entregas da loja; contadores/lista/cadastro sincronizados.
- [x] REQ03 Exclusão STORE abrange entrega,tracking,manifesto; preservar acesso DRIVER sem ampliar delete.
Tasks: domínio/service (payment_scope); UI/regras (root); revisão independente (tracking_validation).
Dia explícito deliveryDate; legados createdAt São Paulo, fallback shipment.date. Fechamento financeiro permanece deliveredAt.
Não escopo: apagar remessas históricas/migrar banco sem evidência; publicar regras depende credenciais disponíveis.

Validação: validation.md (80/80, build e UI). REQ03 satisfeita no arquivo local; publicação remota pendente.
