# Rota automática — 26/09/2026
Pedido atual substitui ETA manual da demanda pagamentos-rota.
Implementado: origem fixa identificada por endereço621, OSRM route (ordem preservada), tempo acumulado e3min entre paradas, saveRoute publico/privado. UI sem datetime-local. Fonte/limites no README.
Validação:65 testes verdes, build aprovado, navegador com consulta real origem->Praça Rui Barbosa->mesmo destino:21:42/21:45 gerados. Sem gravação Firebase nem dados reais de cliente.
Compatibilidade: serviço mantém parâmetro estimates para persistência; UI não aceita horário manual. Conclusão mantém ETA das restantes, nova gravação recalcula desde origem fixa no momento atual.
