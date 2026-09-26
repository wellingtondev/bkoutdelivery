# TASK-01 — Restaurar o contrato de entregas

Cycle ID: corrigir-compilacao-20260926
Requisitos: REQ-01, REQ-02, REQ-03.
Autorizacao: usuario reiterou "Aplique as correções no projeto".
Contexto isolado: agente delivery_fix; somente serviço, modelos e componentes consumidores.
Dependencias: SDK Firebase e modelos existentes; nenhuma dependencia nova.

Decisao: Firebase modular direto; manter subcolecoes previstas nas rules, observar dados em signals, consultar tracking publico por documento e preservar privacidade de telefone/endereco. Propagar falhas de gravacao nas telas.

- [x] Arquitetura e plano — validado no double check; leitura de firebase.ts, models.ts, firestore.rules e consumidores.
- [x] Desenho de verificacoes — validado no double check; TEST-01 build deve eliminar imports e metodos inexistentes; TEST-02 revisao de contratos e tracking privado/publico; TEST-03 servidor e carregamento inicial. Baseline vermelha em diagnostico.md representa o defeito solicitado, nao uma funcionalidade nova.
- [x] Implementacao — validado no double check; delivery_fix alterou servico/modelos/consumidores; detalhes em validacao.md.
- [x] Validacao independente — validado; agente validation revisou sem achados bloqueantes; 11 testes aprovados, build e navegador confirmados pelo coordenador. Ver validacao.md.

Nao executar gravacoes remotas nos testes. Fluxos autenticados reais ficam limitados pela disponibilidade de credenciais e dados.

Validacao independente atribuida ao agente validation; testes offline do servico em tests/delivery.service.test.cjs e revisao contra REQ-02. Coordenador executa compilacao e navegador. O comando ng test nao possui alvo configurado (observado); usar Node test runner existente no runtime, sem instalar infraestrutura Angular nova.

