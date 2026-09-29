# Revisão independente — cadastro manual

2026-09-29, revisor `/root/delivery_map`. Escopo: delta do coordenador em createDelivery/model e switch; não constitui autoaprovação da lógica Store previamente implementada por este agente.

**Resultado: favorável offline ao serviço**, sem achados bloqueantes. `manualEntry === true` é opt-in explícito para ignorar leitura de zonas e aceitar ausência completa de coordenadas; pares incompletos, não finitos ou fora de faixa continuam rejeitados. Valor do pedido e taxa exigem números finitos não negativos. Quando há ponto, os campos privados/públicos são mantidos; sem ponto, lat/lng e destination são omitidos da gravação, sem undefined. Tracking continua criado com status e sem rota inventada. Fluxo automático mantém exigência de coordenadas e leitura das zonas. Modelo sinaliza manualEntry opcional, sem alterar contratos antigos.

Execução independente: `node --test --test-name-pattern='manual creation|explicit manual|zones read failure' tests/delivery.service.test.cjs` → 3 pass, 0 fail. Cenários de validação: manual sem coordenadas e zonas indisponíveis; taxa inválida/coordenadas parciais; erro de zonas não ativa fallback automático.

Switch root possui role=switch, label associado por encapsulamento, disabled durante gravação e estilo de foco. Achado visual inferido por CSS, não por navegador: `.modal label` global usa flex-direction:column; recomendado sobrescrever para row em `.modal .manual-switch`. Coordenador avisado; não é bloqueio funcional.

Limites: sem emulador Firebase, execução remota ou inspeção visual. A revisão não confirma publicação em produção nem encerramento DIO/Obsidian. Confirmação AS-IS parcial local pode citar fonte/execução acima; publicação no vault permanece não realizada.
