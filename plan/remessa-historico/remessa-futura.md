# Ajuste de identidade e remessa posterior
Origem: usuario solicita vermelho no lugar do verde e troca de entrega15:30 para18:00.
Escopo confirmado pela solicitacao: destaques de taxas/quantidades vermelhos; edicao da loja permite manter remessa ou escolher horario cadastrado posterior ao original no mesmo dia. Nao usa relogio atual para determinar posterior. Identidade, tracking e referencias de rota/GPS preservados; concluidas protegidas.
Responsaveis: root estilo e integracao; /root/shipment servico/formulario/location e testes em contexto isolado. Nenhuma alteracao remota.
Baseline observada:152 testes aprovados antes da implementacao. TDD e evidencias finais serao registrados abaixo.

## Validacao final
- [x] Destaques vermelhos no lugar de verde, periodo anterior preservado; root.
- [x] Seletor mantem ID original e lista apenas horarios posteriores sem duplicacao; /root/shipment.
- [x] Transacao revalida horario persistido, destino existente, colisao, status e perfil STORE; preserva dia via deliveryDay, token e referencias de rota; /root/shipment.
- [x] GPS segue referencia canonica no tracking apos troca; /root/shipment.
- [x] Revisao independente root do servico, formulario e GPS: leituras precedem gravacoes, data original e dono/status preservados.
- [x] TDD vermelho antes da implementacao; testes focados75/75, suite completa160/160; build exit0.
- [x] QA tests/visual/later-shipment.cjs desktop1440 e mobile390: vermelho computado, periodo disponivel, seletor15:30+18:00 sem12:30, salvar entrega na remessa18:00 e link intacto, sem overflow/pageerrors.
- [x] HTTP real4202 retorna200 para chunks atualizados da loja e motoboy.
Entrega local aprovada; nenhuma publicacao Firebase/Vercel. Regras locais existentes autorizam operacoes STORE; permissoes remotas nao verificadas. Double check final root: escopo solicitado corresponde aos arquivos e evidencias.
