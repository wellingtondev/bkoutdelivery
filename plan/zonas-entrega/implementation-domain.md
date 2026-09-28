# TASK01 — evidência local do domínio

Ciclo `zonas-entrega-20260928`. Contexto isolado payment_scope, FIO/CodIA. Implementação encaminhada para validação independente, sem aprovação própria.

## Contratos implementados

- `DeliveryZones` schemaVersion1, green/yellow, 3 a 80 vértices por polígono.
- Validação de coordenadas, área não nula, segmentos sem autointerseção e área verde inteiramente contida na amarela. Inclusão testa subsegmentos entre interseções, atendendo também contornos côncavos.
- Pontos na borda pertencem à zona; verde tem prioridade. Taxas fixas10/12/15 para GREEN/YELLOW/OUTSIDE; entrada/config inválida retorna null.
- Serviço observa usuário/perfil e assina configuração somente para STORE ativo. Logout, troca de sessão e revogação descartam callbacks antigos. Save valida, grava snapshot independente e atualiza configuração local somente se sessão/perfil ainda correspondem.
- Cadastro relê configuração persistida: válida recalcula a taxa, ausente conserva compatibilidade manual, inválida ou leitura negada bloqueia. Mudança de usuário durante a leitura bloqueia cadastro. `feeZone` persiste somente no registro privado.
- Regras locais limitam o documento exato a leitura STORE e escrita STORE, schema e tamanho das listas. Geometria completa é validada no cliente; não se afirma validação matemática nas regras.

## Execuções observadas

- Baseline80/80 informada pela coordenação antes da alteração.
- RED geometria: teste falhou porque helper ainda não existia.
- RED ciclo de serviço: dois testes falharam porque serviço ainda não existia.
- RED cadastro: taxa999 enviada permaneceu999, esperado10, antes de integrar recalculo.
- GREEN final: `node --test tests/delivery-zones.test.cjs tests/delivery-zones.service.test.cjs tests/delivery.service.test.cjs`, 46/46 passaram.
- Execução intermediária com glob também encontrou suíte do editor ainda vermelha em outra frente (arquivo ainda não criado); não atribuída ao domínio nem ignorada como aprovação global.

## Limitações

Sem deploy de regras, escrita em Firebase real ou claim de validação por emulador. Regras precisam publicação pela coordenação/usuário. Firestore indisponível não vira taxa de fora da área. UI/editor e validação final são responsabilidades de outras frentes.
