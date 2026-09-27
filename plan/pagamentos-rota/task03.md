# TASK-03 Rota e previsão opcional
Ciclo pagamentos-rota-20260926. REQ-04.
Escopo: service/model/route helper, UI driver/tracking, testes service e preview.
Contrato: saveRoute ids únicos até100, motorista autentica e assume entregas abertas sem outro responsável; manifesto privado por motorista serializa alterações; público recebe apenas posição e estimativa da própria entrega. Confirmação compacta fila e remove estimativa/posição concluída.
estimatedArrival ISO UTC futuro até7dias, opcional, null remove. Exibição cliente Brasília, vencida em atualização.
- [x] Arquitetura — validado: manifesto driverLocations uid, transação com leituras antes writes; regras existentes
- [x] Desenho TDD — validado:3 testes rota red método ausente;2 testes ETA red antes campo/validação
- [x] Implementação — validado:30 testes service verdes;build geral aprovado
- [x] Validação independente — validado: revisao.md (ConfIA), 60 testes, build e visual.md
Evidência visual: preview390px alterou ordem de duas entregas entre remessas, salvou previsão27/09 18:30 e manteve valor no campo; tracking mostrou2ª parada e horário estimado Brasília. Sem escrita Firebase real.

Double check ChefIA: escopo e evidências conferidos; revisão independente aprovada e visual ETA concluída.
