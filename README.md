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
- O link de tracking mostra o destino, etapas e localização atualizada do entregador. Posições com mais de 45 segundos não aparecem como ao vivo. O mapa usa Leaflet e tiles OpenStreetMap com atribuição; requer conexão. Não calcula rota rodoviária nem previsão de chegada.
- **Antes de usar o novo tracking em produção, publique novamente `firestore.rules`** em Firestore Database → Regras. A regra agora permite consultar um tracking pelo token, mas impede listar todos os links e suas coordenadas. A configuração local não publica regras automaticamente.

Validar todas as funcionalidades offline: `npm.cmd run test:features`.

Prévia visual isolada com dados fictícios, sem gravações Firebase:

```powershell
npm.cmd run ng -- serve --build-target blackout-delivery:build:test-preview --host 127.0.0.1 --port 4201
```

Essa configuração usa `tests/visual/main.ts` e não participa do build normal de produção. `npm.cmd run build` continua usando `src/main.ts`.

## Endereço automático em Uberaba e publicação

Ao digitar a rua e o número, o cadastro consulta Photon após 1,2 segundo sem novas teclas. O mapa começa em Uberaba e aceita apenas resultados identificados como Uberaba/BR. Confira e arraste o marcador para a entrada correta; nem todo número está mapeado. Em falhas de conexão, marque manualmente. Somente o texto do endereço é enviado ao provedor, sem nome ou telefone. O serviço público permite uso moderado, sem garantia de disponibilidade: https://github.com/komoot/photon#demo-server.

O histórico do entregador considera apenas registros com driverId igual ao UID conectado e deliveredAt válido. Publicar regras não atualiza a interface. Se ainda aparecer a tela antiga, encerre o ng serve antigo com Ctrl+C, abra um terminal nesta pasta, execute npm.cmd start e recarregue com Ctrl+F5. Não atribua entregas antigas automaticamente: preencha responsável/data somente com dados confirmados.

Para GitHub, mantenha package-lock.json versionado; .gitignore exclui dependências, builds, cache, arquivos locais e credenciais privadas. A configuração Firebase web em src/environments permanece no projeto e a autorização depende das regras Firebase. Nunca adicione chave de conta de serviço.

Na Vercel, selecione esta pasta como Root Directory. vercel.json define npm run build e dist/blackout-delivery/browser, com fallback das rotas Angular. A aplicação não foi publicada automaticamente. Adicione o domínio de produção aos domínios autorizados do Firebase Authentication conforme necessário.
