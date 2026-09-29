# BlackOut Delivery — Angular + Firebase-ready

MVP executável do sistema de remessas, entregador e tracking público.

## Executar
1. Instale Node.js 20+.
2. Na pasta do projeto: `npm install`
3. Execute: `npm start`
4. Abra `http://localhost:4200`

## Demonstração
- `/loja` — painel da loja, remessas e cadastro de entrega
- `/entregador` — entregas da remessa 18:00, GPS e confirmação
- `/track/demo-joao` — tracking público de exemplo

O MVP usa armazenamento em memória para funcionar imediatamente. O próximo passo de produção é conectar Firebase Auth/Firestore e persistir localização/entregas.

## Firebase
Crie um projeto no Firebase Console, habilite Authentication (Email/Senha) e Firestore. Substitua o DeliveryService por um repositório Firestore e configure Security Rules por papel (STORE/DRIVER). Nunca exponha telefone/endereço em consultas públicas; o tracking deve usar token aleatório.

## Vercel
Importe o repositório no Vercel. Build command: `npm run build`. Output: `dist/blackout-delivery/browser`.

## Firebase V2
1. Crie um app Web no Firebase e habilite Authentication (Email/Senha) + Firestore.
2. Cole as credenciais em `src/environments/environment.ts`.
3. Publique `firestore.rules` no Firestore Rules.
4. Crie usuários da loja/entregador no Firebase Authentication.
5. Rode `npm install` e `npm start`.

Coleções: `shipments`, `deliveries`, `tracking`, `driverLocations`, `users`.

## V3 — Firebase Authentication + perfis

Esta versão implementa login real por e-mail/senha, perfil `STORE`/`DRIVER` no Firestore e guards nas rotas `/loja` e `/entregador`.

### Onde colocar as credenciais
Edite **`src/environments/environment.ts`** e substitua os valores `COLE_AQUI`/`SEU-PROJETO` pela configuração do app Web exibida em **Firebase Console > Configurações do projeto > Geral > Seus apps > Web > Configuração do SDK**.

> Não use chave privada de Service Account no Angular. O front-end usa somente a configuração pública do SDK Web; a segurança é feita por Authentication + Firestore Rules.

### Configuração no Firebase
1. Authentication > Sign-in method > habilite **E-mail/senha**.
2. Authentication > Users > crie o usuário da loja e cada entregador.
3. Firestore > coleção `users` > crie um documento cujo ID seja exatamente o **UID** do usuário do Authentication.

Exemplo da loja:
```json
{"name":"BlackOut Shop","email":"loja@exemplo.com","role":"STORE","active":true}
```

Exemplo do entregador:
```json
{"name":"Entregador 01","email":"entregador@exemplo.com","phone":"34999999999","role":"DRIVER","active":true}
```

4. Publique o arquivo `firestore.rules` desta raiz no Firestore Rules.
5. Execute `npm install` e `npm start`.

### Rotas
- `/login` — login real do Firebase
- `/loja` — somente `STORE`
- `/entregador` — somente `DRIVER`
- `/track/:token` — acompanhamento público

## Integração de entregas

O projeto usa o SDK modular `firebase/firestore` com a instância de `core/firebase.ts`, sem AngularFire. As entregas ficam em `shipments/{shipmentId}/deliveries`; o acompanhamento público consulta somente `tracking/{token}`. Telefone e endereço permanecem nos documentos privados.

Os tipos de `Temporal.Instant` expostos pelo Firestore são declarados em `src/types/temporal.d.ts` a partir de `@js-temporal/polyfill`, já listado nas dependências de desenvolvimento. Essa declaração não carrega um polyfill em tempo de execução.

Se o launcher global do npm apresentar `Cannot find module ... npm-cli.js`, o CLI local também pode ser executado diretamente:

```powershell
node node_modules/@angular/cli/bin/ng.js build
node node_modules/@angular/cli/bin/ng.js serve
```

No PowerShell, `npm.cmd run build` e `npm.cmd start` também usam diretamente o launcher do npm para Windows.

Testes offline dos contratos de entregas: `npm run test:service` (ou `npm.cmd run test:service` no PowerShell). Esses testes não acessam o Firebase remoto.

## Remessas, fechamento e acompanhamento

- Na loja, use **Nova remessa** para informar data e horário. Depois, **Nova entrega** permite selecionar a remessa, preencher o endereço e marcar a entrada correta no mapa. A marcação é manual; não há busca automática de endereços nem geocodificação paga. Alterar o endereço exige confirmar novamente o ponto.
- O **Fechamento mensal** mostra quantidade, valor dos pedidos e taxas separadamente. O calendário usa a data efetiva de conclusão no fuso `America/Sao_Paulo`. Entregas antigas sem `deliveredAt` ficam fora dos totais e geram aviso; nenhum dado histórico é inventado. Valores exibidos não representam conciliação de pagamentos.
- No painel do entregador, **Seu histórico** mostra apenas entregas concluídas vinculadas ao usuário conectado: total de hoje, total do mês selecionado e calendário com detalhamento do dia por remessa. A confirmação registra o responsável mesmo sem GPS. Entregas antigas sem responsável não são atribuídas automaticamente; entregas abertas de outros entregadores não aparecem na lista de trabalho. Esse filtro de apresentação não altera as permissões de leitura staff existentes no Firestore.
- No painel do entregador, **Iniciar entrega e GPS** inicia o compartilhamento para aquela entrega. Permita a localização e mantenha o aplicativo aberto. **Parar GPS**, sair do painel ou confirmar a entrega encerra o compartilhamento. O navegador precisa de HTTPS em produção (ou localhost para desenvolvimento). Não há garantia de GPS em segundo plano ou com a tela bloqueada.
- O link de tracking mostra o destino, etapas e localização atualizada do entregador. Posições com mais de 45 segundos não aparecem como ao vivo. O mapa usa Google Maps JavaScript API, com marcador 🐺 para o entregador. Requer chave configurada e conexão. A estimativa é calculada ao salvar a ordem da rota.
- **Antes de usar o novo tracking em produção, publique novamente `firestore.rules`** em Firestore Database → Regras. A regra agora permite consultar um tracking pelo token, mas impede listar todos os links e suas coordenadas. A configuração local não publica regras automaticamente.

Validar todas as funcionalidades offline: `npm.cmd run test:features`.

Prévia visual isolada com dados fictícios, sem gravações Firebase:

```powershell
npm.cmd run ng -- serve --build-target blackout-delivery:build:test-preview --host 127.0.0.1 --port 4201
```

Essa configuração usa `tests/visual/main.ts` e não participa do build normal de produção. `npm.cmd run build` continua usando `src/main.ts`.

## Endereço automático em Uberaba e publicação

Ao digitar a rua e o número, o cadastro consulta o Geocoding do Google após 1,2 segundo sem novas teclas. Aceita apenas endereços de Uberaba/MG/BR e recusa centroides de cidade e correspondências parciais. Confira o ponto retornado e arraste o marcador para ajustar a entrada; uma busca não garante a posição exata. Alterações cancelam a aplicação de respostas antigas. Apenas o endereço é enviado, sem nome ou telefone.

O histórico do entregador considera apenas registros com driverId igual ao UID conectado e deliveredAt válido. Publicar regras não atualiza a interface. Se ainda aparecer a tela antiga, encerre o ng serve antigo com Ctrl+C, abra um terminal nesta pasta, execute npm.cmd start e recarregue com Ctrl+F5. Não atribua entregas antigas automaticamente: preencha responsável/data somente com dados confirmados.

Para GitHub, mantenha package-lock.json versionado; .gitignore exclui dependências, builds, cache, arquivos locais e credenciais privadas. A configuração Firebase web em src/environments permanece no projeto e a autorização depende das regras Firebase. Nunca adicione chave de conta de serviço.

Na Vercel, selecione esta pasta como Root Directory. vercel.json define npm run build e dist/blackout-delivery/browser, com fallback das rotas Angular. A aplicação não foi publicada automaticamente. Adicione o domínio de produção aos domínios autorizados do Firebase Authentication conforme necessário.


## Pagamento e operação do entregador
No cadastro da entrega, pedidos pendentes exigem Pix, dinheiro, débito ou crédito em 1x/2x/3x. O total a cobrar soma pedido e taxa. Marcar pago significa que pedido e taxa já estão pagos. Observações de até 500 caracteres ficam disponíveis somente para a equipe.
O entregador agrupa as entregas por remessa, expande/recolhe detalhes e mantém cobrança e forma de pagamento em destaque. O resumo mostra taxas das próprias entregas concluídas hoje em Brasília, sem afirmar repasse financeiro.
Cheguei prepara uma mensagem no WhatsApp do telefone brasileiro cadastrado; o entregador confirma o envio no WhatsApp. Não há envio automático nem comprovação de que a mensagem foi enviada. Referência: https://faq.whatsapp.com/5913398998672934.

A ordem da rota é pessoal e pode atravessar remessas. Use setas e Salvar ordem da rota; isso vincula as entregas selecionadas ao entregador. O link recebe apenas sua posição, atualizada ao concluir paradas. A previsão agora é automática ao salvar a rota: partida naquele momento da Rua Cândida Mendonça Bilharinho, 621, Mercês, Uberaba/MG, trajeto rodoviário na sequência escolhida e 3 minutos entre paradas. Cliente vê horário de Brasília. O Google considera trânsito na consulta; previsão vencida pede atualização. Recalcular no meio do trajeto ainda considera a saída fixa, não o GPS atual. O manifesto privado usa driverLocations/{uid}, já autorizado para o próprio DRIVER nas regras do projeto.

## Cálculo automático de chegada
A origem configurada (-19.7424531,-47.9483885) foi localizada na ficha pública do número621 (Residencial Parque Umuarama): https://www.waze.com/live-map/directions/br/mg/condominio-residencial-parque-umuarama?to=place.ChIJU_uu5LDRupQR_Jab_0EO6KM. O cálculo usa os pontos marcados nos endereços das entregas e preserva sua ordem.
Google Maps Routes Library (Routes API), perfil DRIVING com TRAFFIC_AWARE. Preserva a sequência escolhida pelo entregador; não otimiza a ordem. Até 99 paradas, divididas em consultas com até 25 intermediárias e uma parada final. Só envia coordenadas, sem nomes/telefones/notas. Inclui 3 minutos entre entregas. Erros não inventam estimativas: a ordem pode ser salva sem previsão. Cancelar interrompe a aplicação do resultado, não necessariamente uma chamada já enviada ao Google.
A versão anterior foi verificada no navegador até Praça Rui Barbosa. A integração Google é validada localmente com respostas simuladas; chamadas reais ainda não foram verificadas.

## Gerenciar entregas pela loja
Na lista da remessa, Marcar como pago confirma pedido e taxa pagos; a atualização privada/pública é transacional e aparece nos listeners do entregador. Não altera status nem data de conclusão. Excluir entrega exige confirmação e remove entrega/tracking permanentemente, inclusive dos totais históricos. Remove a parada da rota, compacta posições e limpa estimativas restantes para recalcular.
Publique novamente firestore.rules antes de excluir entregas vinculadas a rotas: STORE pode atualizar somente routeEntries do manifesto existente. Regras não são publicadas automaticamente. Validação local: 69 testes, build e navegador (pagamento e cancelamento da exclusão) com dados fictícios; nenhuma exclusão real realizada.

## Remessas diárias e calendário

Os horários de remessa são fixos e reutilizados todos os dias. Selecione o dia no calendário da loja antes de cadastrar: os cartões, contadores, lista e nova entrega usam esse dia. Horários legados repetidos são reunidos na tela, mantendo seus documentos e entregas. Não é necessário recriar os horários diariamente.

Novas entregas salvam `deliveryDate`. Para registros antigos, o dia é obtido de `createdAt` em São Paulo; se ausente, usa a data histórica da remessa. O fechamento financeiro continua pela data real de conclusão (`deliveredAt`), podendo diferir do dia agendado.

Para habilitar a exclusão em produção, copie o conteúdo completo de `firestore.rules` em **Firebase Console → Firestore Database → Regras** e clique em **Publicar**. O perfil em `users/{UID}` deve ter `role: "STORE"` e não pode ter `active: false`. As regras permitem à loja excluir a entrega e seu tracking e retirar a parada do manifesto. O campo `active` ausente é aceito, conforme o login. `firebase.json` também aponta para esse arquivo para publicação por CLI autenticada. Compilar ou publicar o aplicativo na Vercel não publica as regras Firebase.

Validação desta mudança: 80 testes offline, build de produção e navegação com dados fictícios. Regras remotas não publicadas nem testadas neste ambiente.

## Taxa automática por zonas

Na loja, abra **Zonas de entrega**. Desenhe o contorno verde (R$ 10) e o contorno amarelo externo (R$ 12), envolvendo toda a área verde, e salve. Use pontos ao redor do perímetro, sem cruzar as linhas. Fora do amarelo, a taxa é R$ 15. As bordas pertencem à zona desenhada; na borda verde prevalece R$ 10. Nenhum limite da imagem foi presumido: os contornos reais são definidos pela loja.

O destino encontrado ao digitar o endereço, ou ajustado manualmente no mapa, determina a taxa. A taxa fica automática depois de configurar as zonas e é revalidada no cadastro. Sem configuração, permanece o valor manual. Erro ao ler a configuração bloqueia a criação para evitar cobrança incorreta. Atualizar as zonas não altera valores históricos.

A configuração compartilhada fica em settings/deliveryZones, com acesso apenas STORE. **Publique novamente firestore.rules antes de usar esta versão**, pois as novas permissões de configuração não são publicadas pela Vercel. As mesmas zonas serão carregadas nas outras sessões da loja. Sem autenticação Firebase local, o deploy das regras continua a cargo da loja.

## Configurar Google Maps

A chave de navegador fornecida foi configurada em src/environments/google-maps.config.ts. Configure mapId com seu Map ID JavaScript. DEMO_MAP_ID serve para teste dos Advanced Markers. A chave Firebase não é reutilizada automaticamente.

No Google Cloud, ative faturamento e as APIs **Maps JavaScript API**, **Geocoding API** e **Routes API**. A busca com sugestões utiliza Places API (New), que também deve estar habilitada e autorizada nas restrições da chave. Restrinja a chave aos sites autorizados (localhost para desenvolvimento e seus domínios de produção/Vercel) e a essas APIs. Configure cotas adequadas. Uma chave de navegador aparece no bundle por design; nunca coloque credenciais de servidor ou conta de serviço nesse arquivo.

Depois de alterar a configuração, reinicie npm.cmd start ou gere novo build/deploy. Sem chave, o aplicativo mostra indisponibilidade e bloqueia operações que precisam do mapa, preservando dados já existentes. A integração não foi validada contra o serviço pago: os testes usam respostas simuladas. GPS continua vindo do navegador e sendo compartilhado pelo Firestore, não de posição inventada pelo mapa. Zonas salvas mantêm coordenadas e taxas10/12/15, sem redesenho ou migração.

Referências oficiais: [carregamento](https://developers.google.com/maps/documentation/javascript/load-maps-js-api), [Geocoding](https://developers.google.com/maps/documentation/javascript/geocoding), [Routes](https://developers.google.com/maps/documentation/javascript/routes/start), [Advanced Markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/start), [restrições de chave](https://developers.google.com/maps/api-security-best-practices).


## Acompanhamento pelo GPS
O link do cliente mostra o marcador 🐺 na posição recebida do entregador e calcula o trajeto Google a partir dela. O cálculo é limitado a uma tentativa por minuto por página aberta; o GPS continua atualizando independentemente. Posições com 45 segundos ou mais deixam de aparecer como ao vivo. A previsão direta vale para a próxima parada; para paradas posteriores é mantida a estimativa salva da sequência inteira, e o trecho direto no mapa é identificado.
O perfil abaixo do mapa exibe Motoboy Parceiro e cinco estrelas decorativas, sem atribuir avaliações reais de clientes. Falha no serviço ou GPS desatualizado remove o trajeto e a previsão ao vivo, sem inventar movimento. O Google Cloud e o compartilhamento GPS do entregador precisam estar ativos para validar esse fluxo em produção.

## Clientes no mapa e edição
A loja tem o botão **Clientes**, que abre um mapa Google dos destinos das entregas concluídas. Cada ponto mostra 🐺 e o nome; o mesmo nome no mesmo ponto é agrupado. Usa todo o histórico carregado, independentemente do dia selecionado. Entregas sem coordenadas válidas não recebem posição inventada. Os dados continuam restritos à equipe no Firestore e o mapa só está disponível na tela da loja; nenhum dado novo é publicado no tracking.
A busca de endereço usa Google Geocoding e restringe Uberaba/MG. Informe rua, número e bairro, preferencialmente separados por vírgula. Um resultado do tipo rua inteira ou um número diferente do informado não é marcado automaticamente. Mesmo quando encontrado, confira a entrada no mapa, pois geocodificação não garante a porta exata. Referência: https://developers.google.com/maps/documentation/javascript/geocoding.
As ações Tracking, Alterar entrega, Marcar como pago e Excluir entrega se ajustam ao celular e desktop. A edição preserva identidade, remessa/dia e status; dados públicos são sincronizados sem expor telefone/observações. A taxa histórica fica preservada se as coordenadas não mudarem. Mudar o destino recalcula a taxa e invalida previsões da rota. Entregas concluídas não são editáveis para proteger o fechamento.
Prioridade adicional e WhatsApp ainda não implementados: aguardam número completo e regra de cobrança do usuário.


## Busca com sugestões do Google
O cadastro agora consulta Places Autocomplete (New) e apresenta opções para selecionar. Depois da seleção, Place Details retorna a localização; o destino e a taxa são atualizados. A busca usa uma sessão por edição/seleção e limita as sugestões à região urbana de Uberaba; o endereço selecionado é conferido como Uberaba/MG. Se não houver número confirmado, marque a entrada manualmente.
Se o mapa abre mas a busca é negada, confira no projeto da chave: **APIs e serviços → Biblioteca → Places API (New) → Ativar**; em Credenciais, permita essa API na chave, mantenha Maps JavaScript API e autorize o domínio atual. Confira faturamento e cotas. A aplicação mostra erros de permissão, quota e tempo excedido sem expor a chave. Essa configuração não pode ser confirmada apenas por o mapa estar visível.
Referência: https://developers.google.com/maps/documentation/javascript/place-autocomplete-data.
No cadastro de nova entrega, o switch Adicionar manualmente libera endereço e taxa sem Google ou ponto obrigatório. Sem coordenadas, o tracking acompanha status, mas não calcula trajeto/chegada nem inclui o destino no mapa de clientes. A taxa manual não é substituída pelas zonas. Desligar o switch restaura o fluxo automático.
