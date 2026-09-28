# Validação FIO — remessas-diarias-20260928

- Build produção: npm.cmd run build, sucesso; aviso preexistente Leaflet CommonJS.
- Suite final: npm.cmd run test:features, 80/80 sucesso.
- UI com fixture sem Firebase: dois documentos 18:00 aparecem em único cartão; 28/09 lista2, 26/09 lista1, 27/09 lista0. Modal usa dia selecionado e opção única. Próximo mês sincroniza 01/10 e zero entregas.
- Fechamento financeiro preservado pela data de conclusão; calendário operacional por deliveryDate/criação São Paulo/legado.
- Revisão independente: review.md; root revisou driver-groups.ts, integração DriverComponent, rótulo de histórico e3 testes: sem achados pendentes.
- Regras STORE corrigidas localmente: perfil active ausente compatível, delete privado/tracking e atualização restrita do manifesto de rota. Não executadas em emulador nem publicadas: CLI/autenticação indisponíveis.
- Sem exclusão/migração de dados reais; histórico e documentos legados preservados.
- Vault Obsidian não disponível; documentação local parcial.
