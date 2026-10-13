# Remessa e historico do motoboy

Cycle ID: remessa-historico-20261013
Status: implementado e validado localmente; ciclo parcial pela publicacao Obsidian pendente.
Projeto: H:/delivery/bkoutdelivery
Origem: solicitacao do usuario de 2026-10-13 via CIM.

## Objetivo
Permitir a loja trocar uma entrega entre horarios de remessa existentes e permitir ao motoboy consultar valores de suas entregas por dia, semana e mes.

## Proposta para confirmacao
- [x] REQ-01: Na edicao de entrega ainda nao concluida, escolher outro horario ja cadastrado, mantendo o dia agendado e os dados da entrega.
- [x] REQ-02: Preservar o link de acompanhamento e sincronizar a remessa com a visao do motoboy; reconciliar referencias de rota afetadas pela troca.
- [x] REQ-03: No historico do proprio motoboy, selecionar dia, semana (segunda a domingo) ou mes e mostrar quantidade e soma das taxas das entregas concluidas no periodo.
- [x] REQ-04: Ao clicar em um dia do calendario, mostrar o valor daquele dia e suas entregas. Usar a data efetiva de conclusao em America/Sao_Paulo.

Nao-escopo proposto: alterar entregas concluidas, mudar o dia agendado nesta troca, registrar repasses, publicar regras remotas ou dados de producao.

## Registro da entrevista
1. Pergunta: Confirma a proposta acima, com valores significando taxas de entrega do motoboy e semana de segunda a domingo?
   Resposta: "Confirmo o escopo pode aplicar".

## Checklist de tasks
- [x] TASK-01: Trocar remessa preservando tracking, GPS e rota - task01.md - REQ-01, REQ-02; integracao GPS resolvida e revalidada.
- [x] TASK-02: Historico por dia, semana e mes - task02.md - REQ-03, REQ-04.

## Evidencias e pendencias
- Observado: store.component.html bloqueia a remessa durante edicao; delivery.service.ts rejeita remessa diferente.
- Observado: README descreve historico restrito ao proprio motoboy e fechamento pela data real de conclusao.
- Vault nao identificado nos estados existentes; consolidacao Obsidian e baseline persistente pendentes.
- Requisitos e nao-escopo aprovados pela resposta explicita do usuario.
- ChefIA, double check final 2026-10-13: aprovado. Checks de tasks reconciliados com validation.md e delivery.md; 160/160 testes, build, QA desktop/celular. REQ-01 a REQ-04 concluidos com ambas tasks validadas.
- Double check repetido apos integracao GPS: falha historica resolvida na TASK-01; ConfIA GPS11/11 aprovada; suite final162/162, ambos requisitos e task novamente concluidos. Publicacao Obsidian continua pendente.
