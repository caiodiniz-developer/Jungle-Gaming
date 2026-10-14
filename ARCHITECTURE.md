# Arquitetura

Como a aplicação é organizada, quais contratos ela usa e por que as decisões principais foram tomadas. Para rodar e reproduzir cenários, veja o [README.md](README.md).

## 1. Visão geral

```
interface (rotas e features)
   │  hooks do TanStack Query            eventos
   ▼                                        ▲
src/api/*  ── Axios ──►  REST   ┐           │
                                ├─ MSW (camada de rede) ── banco simulado
src/realtime/* ── socket.io-client ──►  WebSocket ┘
```

- **A interface nunca sabe que a API é simulada.** Componentes e hooks chamam funções de `src/api/`, que usam o Axios. As respostas vêm de handlers do MSW, que interceptam a requisição na camada de rede. Não há respostas fictícias em componentes, hooks ou no cliente HTTP.
- **Um banco simulado único** (`src/mocks/db.ts`) alimenta as respostas REST e os eventos Socket.IO, o que mantém catálogo, favoritos, carrinho, perfil, carteiras e pedidos coerentes entre si.
- **Os tipos são compartilhados.** `src/api/contracts.ts` define os contratos REST e de eventos; `src/api/schemas.ts` define as validações (zod). Os formulários e os handlers do MSW usam os mesmos schemas, então a interface e a API simulada rejeitam exatamente os mesmos dados.

### Responsabilidades por pasta

| Pasta | Responsabilidade |
| --- | --- |
| `src/api/` | Contratos, schemas e uma função por operação REST |
| `src/lib/` | Cliente Axios e erro único (`ApiError`), ambiente, aritmética de ETH, chaves de cache, token da sessão |
| `src/realtime/` | Conexão Socket.IO, filtro de eventos (duplicatas e versões antigas) e aplicação dos eventos ao cache |
| `src/features/` | Uma pasta por domínio: hooks de dados e telas |
| `src/routes/` | Rotas por arquivo; só ligam URL, guarda e componente |
| `src/mocks/` | Handlers, regras de negócio (`domain/`), fixtures, cenários e servidor Socket.IO simulado |
| `src/prerender/` | Renderização, no build, da primeira dobra mobile (seção 13) |
| `src/components/ui/` | Primitivos do shadcn/ui adaptados aos tokens do layout |

### shadcn/ui

Os primitivos em `src/components/ui/` foram reestilizados com os tokens do Figma (cores, raios, alturas) e são a base dos controles: `Button`, `Input`, `Label` e `Textarea` em todos os formulários (via [src/components/form-fields.tsx](src/components/form-fields.tsx)), `Checkbox` nas carteiras, `Dialog` (login, cadastro, zoom, recibo), `Sheet` (filtros), `DropdownMenu` (menu da conta), `Select` (ordenação), `Slider` (faixa de preço), `Skeleton` e `Sonner` (avisos). Ficaram como elementos nativos, de propósito: os `<select>` dos formulários (teclado e leitor de tela do sistema, inclusive no celular) e os rádios e caixas desenhados como cartão, em que o campo nativo invisível cobre o cartão inteiro.

O pagamento, a tela com mais estado, é dividido assim (`src/features/checkout/`):

| Arquivo | Responsabilidade |
| --- | --- |
| `checkout-page.tsx` | Espera sessão, carteiras e carrinho; decide entre carregando, erro, vazio e formulário |
| `checkout-form.tsx` | Compõe a tela e liga os três estados abaixo |
| `use-quote-review.ts` | Qual cotação o usuário já revisou; detecta mudança em tempo real |
| `use-wallet-connection.ts` | Conexão simulada da carteira (conectar, recusar, desconectar) |
| `use-order-submission.ts` | Envio do pedido e a recuperação de cada código de erro |
| `order-attempt.ts` | Chave de idempotência da tentativa |
| `collector-fields.tsx`, `wallet-picker.tsx`, `provider-options.tsx`, `order-review.tsx` | Partes visuais, sem regra de negócio |

## 2. Contratos REST

Prefixo `/api`. Corpo e respostas em JSON. A fonte dos tipos é [src/api/contracts.ts](src/api/contracts.ts).

| Recurso | Operação | Observações |
| --- | --- | --- |
| Sessão | `POST /auth/register` | `{ username, email, password, guestCartId? }` → `Session`. 409 `EMAIL_TAKEN` / `USERNAME_TAKEN` |
| | `POST /auth/login` | `{ email, password, guestCartId? }` → `Session`. 401 `INVALID_CREDENTIALS` |
| | `GET /auth/session` | Sessão atual. 401 `SESSION_EXPIRED` |
| | `POST /auth/logout` | 204 |
| NFTs | `GET /nfts` | `q`, `categories`, `networks` (listas separadas por vírgula), `minPrice`, `maxPrice`, `tab`, `sort`, `page`, `pageSize` → itens, paginação e facetas |
| | `GET /nfts/:nftId` | Detalhe com edições e relacionados. 404 `NOT_FOUND` |
| Favoritos | `GET /favorites`, `PUT /favorites/:nftId`, `DELETE /favorites/:nftId` | Sempre devolvem `{ nftIds }` |
| Carrinho | `GET /cart` | Carrinho do usuário ou do visitante |
| | `POST /cart/items` | `{ nftId, editionId, quantity }`. 409 `AVAILABILITY_CONFLICT` com `details.maxQuantity` |
| | `PATCH /cart/items/:lineId`, `DELETE /cart/items/:lineId` | `lineId` = `nftId:editionId` |
| | `PUT /cart/coupon`, `DELETE /cart/coupon` | 422 `COUPON_INVALID` / `COUPON_EXPIRED`, com a mensagem no campo `code` |
| Cotação | `POST /quotes` | `{ network? }` → subtotal, desconto, taxa de rede, total, `purchasable` e `hash` |
| Pedidos | `POST /orders` | Cabeçalho `Idempotency-Key` obrigatório. 202 (criado, pendente) ou 200 (mesma tentativa). 409 `ORDER_PENDING` se a conta já tem um pedido aguardando confirmação |
| | `GET /orders`, `GET /orders/:orderId` | 404 `NOT_FOUND`, 403 `FORBIDDEN` para pedido de outra conta |
| Perfil | `GET /profile`, `PATCH /profile`, `PUT /profile/avatar`, `DELETE /profile/avatar`, `PUT /profile/password` | Conflitos e erros de validação por campo |
| Carteiras | `GET /wallets`, `POST /wallets`, `PUT /wallets/:walletId` | Uma principal e uma secundária, com endereços distintos |
| | `POST /wallets/:walletId/connection`, `DELETE …/connection` | Simulação de conexão. 403 `WALLET_REJECTED` |

Autenticação: `Authorization: Bearer <token>`. Visitantes identificam o carrinho com `X-Cart-Id`.

### Erros

Toda resposta de erro tem o mesmo corpo:

```ts
{ code: ApiErrorCode; message: string; fields?: Record<string, string>; details?: unknown }
```

| Situação | Status e código |
| --- | --- |
| Validação | 422 `VALIDATION_ERROR`, com `fields` |
| Sessão inválida | 401 `UNAUTHENTICATED` / `SESSION_EXPIRED` |
| Falta de permissão | 403 `FORBIDDEN` / `WALLET_REJECTED` |
| Recurso inexistente | 404 `NOT_FOUND` |
| Conflito de disponibilidade | 409 `AVAILABILITY_CONFLICT` |
| Cotação desatualizada | 409 `QUOTE_STALE`, com `details.quote` e `details.changes` |
| Idempotência | 409 `IDEMPOTENCY_CONFLICT` |
| Compra já em andamento | 409 `ORDER_PENDING`, com `details.orderId` |
| Falha transitória | 503 `SERVICE_UNAVAILABLE`, 500 `INTERNAL_ERROR` |

No cliente, o interceptor do Axios converte qualquer falha — resposta 4xx/5xx, rede, timeout, cancelamento — em um `ApiError` ([src/lib/http.ts](src/lib/http.ts)) com `code` estável. A interface decide o que mostrar pelo `code`, nunca pelo texto.

### Valores em ETH

Valores trafegam como strings decimais (`"1.19"`). Para calcular, são convertidos para wei em `bigint` ([src/lib/eth.ts](src/lib/eth.ts)); nunca passam por `number`. A interface não soma nem multiplica valores: subtotal, desconto, taxa e total vêm sempre da cotação da API. Quantidades são inteiras.

### Idempotência do pedido

O cliente gera uma `Idempotency-Key` por **tentativa de compra** e a guarda no `sessionStorage` junto com o corpo do pedido ([src/features/checkout/order-attempt.ts](src/features/checkout/order-attempt.ts)). Enquanto o corpo for o mesmo — clique repetido, nova tentativa após timeout ou falha de rede, refresh — a mesma chave é reenviada e a API devolve o pedido já criado. Corpo diferente (nova cotação, outra carteira) recebe chave nova. No mock, a mesma chave com corpo diferente responde 409 `IDEMPOTENCY_CONFLICT`.

A chave protege a mesma tentativa; uma tentativa **nova** com o mesmo carrinho é barrada por outra regra: enquanto a conta tiver um pedido pendente, `POST /orders` responde 409 `ORDER_PENDING` com o id desse pedido, e a interface leva o usuário até ele. Sem isso, voltar ao pagamento durante a espera compraria os mesmos itens duas vezes, porque o carrinho só é esvaziado na confirmação.

O `hash` da cotação faz parte do corpo. Ele cobre preço, quantidade, disponibilidade, cupom e taxa; se a cotação atual do servidor tiver outro hash, o pedido é recusado com `QUOTE_STALE` e nada é comprado.

## 3. Eventos em tempo real

Transporte: Socket.IO sobre WebSocket (sem long-polling), caminho `/socket.io`.

```ts
{ id, type, resource: { type, id }, version, occurredAt, userId?, data }
```

| Evento | `data` | Quem recebe |
| --- | --- | --- |
| `nft.updated` | `{ nft, editions }` | Todas as conexões |
| `order.updated` | `{ order }` | Só as conexões associadas ao dono do pedido |

O cliente emite `session.join { token }` ao conectar e ao entrar, e `session.leave` ao sair.

- **Duplicatas e eventos antigos** ([src/realtime/events.ts](src/realtime/events.ts)): um `id` já visto é descartado; um evento só é aplicado se sua `version` for maior que a última conhecida do mesmo recurso. As respostas REST também registram a versão que trouxeram, para que um evento atrasado não regrida um dado mais novo vindo da API.
- **Isolamento por usuário:** eventos privados só são entregues a conexões que fizeram `session.join` com o token do dono. No cliente, a troca de sessão zera o filtro de eventos e as chaves de cache privadas, e um `order.updated` cujo `userId` não é o da conta em tela é descartado (cobre o evento que chega logo depois do logout ou da troca de usuário).
- **Ciclo de vida:** o provider registra os listeners ao montar e os remove (e desconecta) ao desmontar.

### Reconciliação entre REST e Socket.IO

A API REST é a fonte da verdade; os eventos são um atalho para atualizar a tela antes.

| Situação | O que acontece |
| --- | --- |
| `nft.updated` | Listas e detalhe em cache recebem o novo preço e disponibilidade na hora. Carrinho e cotação são **invalidados** e buscados de novo: os valores a pagar nunca são calculados a partir do evento |
| `order.updated` | O pedido em cache passa ao novo estado; lista de pedidos, carrinho e cotação são invalidados |
| Reconexão | Todas as consultas ativas são invalidadas e refeitas pela API |
| Evento perdido com pedido pendente | A página do pedido consulta a API a cada 4 s enquanto o estado for `pending` |
| Resposta REST de um pedido mais antiga que um evento | A resposta é descartada se sua `version` for menor que a do pedido em cache |

Com o carrinho ou o pagamento abertos, uma mudança de preço ou disponibilidade gera um aviso. No pagamento, se a cotação em tela deixar de ser a que o usuário revisou, aparece o aviso "Os valores mudaram" e o botão vira "Confirmar com os novos valores": a compra só segue com uma nova confirmação. Mesmo que o evento se perca, o servidor recusa a cotação antiga (`QUOTE_STALE`).

## 4. Sessão

- O token fica no `localStorage`; a senha nunca é armazenada. No mock, senhas são guardadas como hash SHA-256 com salt.
- Ao recarregar, `GET /auth/session` recupera o usuário.
- Rotas privadas (`/conta/*`, `/pagamento`, `/pedidos/*`) têm guarda no `beforeLoad` do TanStack Router: sem token, redirecionam para `/entrar?redirect=<destino>`. O destino só aceita caminhos internos.
- **Expiração:** qualquer 401 numa chamada autenticada encerra a sessão local, limpa os dados privados e, se a tela exigir conta, leva ao login guardando o endereço atual ([src/features/auth/session-watcher.tsx](src/features/auth/session-watcher.tsx)). No checkout, o carrinho fica no servidor, então a compra é retomada depois do login.
- **Logout e troca de usuário:** as consultas privadas (sessão, favoritos, carteiras, carrinho, cotação, pedidos) são canceladas e removidas do cache, o filtro de eventos é zerado e a conexão deixa a sessão. Além disso, as chaves de cache privadas incluem o identificador da sessão, então dados de uma conta nunca são reaproveitados por outra.

## 5. Carrinho

- O carrinho vive no servidor (simulado). O visitante tem um identificador local enviado em `X-Cart-Id`; ao entrar ou se cadastrar, esse identificador vai no corpo e a API incorpora os itens ao carrinho da conta, somando quantidades.
- Cada linha é um par NFT + edição e traz `maxQuantity` e `status` (`ok`, `limited`, `unavailable`). A interface limita o seletor a `maxQuantity` e oferece o ajuste quando a disponibilidade cai.
- **Atualização otimista:** alterar quantidade e remover item mudam a tela na hora e fazem rollback se a API falhar ([src/features/cart/use-cart.ts](src/features/cart/use-cart.ts)). Só a quantidade é otimista; os valores esperam a resposta. Favoritar também é otimista.
- Todas as mutations do carrinho compartilham um `scope` do TanStack Query: são enviadas uma por vez, na ordem dos cliques, então uma resposta atrasada não sobrescreve uma mais recente.
- A cotação é refeita a cada alteração do carrinho. "Finalizar" fica desabilitado enquanto houver linha indisponível.
- No mock, o estoque não é reservado na criação do pedido; é baixado na confirmação, que também remove do carrinho apenas as quantidades compradas. Pedido recusado deixa o carrinho intacto.

## 6. Cache, novas tentativas e sincronização

Política definida em [src/lib/query-client.ts](src/lib/query-client.ts):

| Item | Política |
| --- | --- |
| Dados "frescos" | 30 s; depois, revalidação em segundo plano. A cotação tem `staleTime` 0 |
| Retenção em cache | 5 min sem uso |
| Novas tentativas de consultas | Até 2, só em falhas transitórias (rede, timeout, 5xx), com espera de 0,5 s e 1 s |
| Novas tentativas de mutations | Nenhuma automática. Quem repete é o usuário; o pedido usa idempotência |
| Foco da janela | Não refaz consultas; reconexão de rede refaz |

- **Chaves de cache** ([src/lib/query-keys.ts](src/lib/query-keys.ts)): consultas do catálogo levam os parâmetros na chave; consultas privadas levam a sessão.
- **Respostas obsoletas:** cada consulta recebe o `AbortSignal` do TanStack Query, repassado ao Axios. Quando os filtros mudam, a requisição anterior é cancelada; se a resposta chegar mesmo assim, é descartada, porque a chave já é outra.
- **Estado na URL:** busca, filtros, ordenação, aba e página são parâmetros validados por schema na rota do catálogo; mudar um filtro reinicia a página.
- **Carregamento em segundo plano:** ao trocar de página ou filtro, a lista anterior continua visível (esmaecida) até a nova chegar.
- Mutations gravam a resposta direto no cache quando ela já é o recurso atualizado, e invalidam o que depende dele (por exemplo, o carrinho invalida a cotação).

## 7. Mocks

- **Ativação:** `VITE_ENABLE_MOCKS` (ligado por padrão). `src/main.tsx` inicia o MSW antes de renderizar a aplicação. Com a variável em `false`, o código dos mocks não é baixado.
- **Persistência e reset:** o banco simulado e a configuração do cenário ficam no `localStorage`. `?reset-mocks` (ou `__kurioMocks.reset()`) restaura o cenário conhecido por inteiro: banco recriado a partir das fixtures determinísticas (gerador com semente fixa), cenário `padrao` com os contadores de latência e de falhas zerados, pedidos agendados cancelados e histórico de eventos limpo. Como as sessões do banco deixam de existir, o token e o carrinho de visitante guardados no navegador também são descartados.
- **Fixtures:** 239 NFTs em 9 categorias e 3 redes, dois usuários, três cupons.
- **Rede e falhas** ([src/mocks/http.ts](src/mocks/http.ts), [src/mocks/config.ts](src/mocks/config.ts)): toda rota passa por latência do cenário → falha injetada → handler. As falhas podem ser resposta HTTP, erro de rede ou timeout, antes ou **depois** do handler (o efeito acontece, mas o cliente não fica sabendo), com limite de ocorrências.
- **Controle** ([src/mocks/control.ts](src/mocks/control.ts)): `window.__kurioMocks` muda cenário, altera preço e disponibilidade, resolve pedidos, derruba conexões e reemite eventos. Ele age só no banco e no servidor Socket.IO simulados; o efeito chega à interface pelas respostas REST e pelo `socket.io-client`.

### Socket.IO simulado: transporte e limitações

O servidor de eventos é um handler de WebSocket do MSW com `@mswjs/socket.io-binding`, que fala o protocolo do Socket.IO. O cliente é o `socket.io-client` real, só com o transporte `websocket`.

- **Sem long-polling:** o binding só cobre WebSocket, por isso o cliente é configurado com `transports: ["websocket"]`.
- **Heartbeat:** o binding anuncia `pingInterval` no handshake, mas não envia pings; o mock envia o pacote de ping a cada 20 s para o cliente não derrubar a conexão.
- **Servidor "fora do ar":** para simular recusa de conexão, o mock conclui o handshake do Engine.IO e fecha em seguida, sem aceitar o namespace. Fechar antes do handshake deixava o cliente parado até o timeout de 20 s do Socket.IO; assim ele entra no ciclo normal de reconexão.
- **Ordem de carregamento:** o `socket.io-client` guarda a referência de `WebSocket` quando é avaliado, e o MSW precisa tê-la substituído antes. Por isso a biblioteca é carregada sob demanda ([src/realtime/socket.ts](src/realtime/socket.ts)), depois de os mocks iniciarem.
- **Um navegador por vez:** o banco e o servidor de eventos vivem na aba. Cada aba carrega sua cópia do banco ao abrir e não troca eventos com as outras.
- **Outros WebSockets** da mesma origem (como o HMR do Vite) são repassados ao servidor real.

## 8. Testes e integração contínua

| Nível | Ferramenta | O que cobre |
| --- | --- | --- |
| Unitário | Vitest (`src/**/*.test.ts`) | Lógica pura, sem navegador: aritmética de ETH, filtro de eventos duplicados e antigos, chave de idempotência, estado do catálogo na URL, destino pós-login, cotação e fusão de carrinho da API simulada, determinismo dos cenários |
| E2E | Playwright (`tests/`) | Fluxos de tela com REST e Socket.IO simulados, em desktop e mobile, e regressão visual |

A divisão segue um critério: regra que cabe numa função sem DOM é testada no nível unitário, onde o teste roda em milissegundos e aponta a linha que quebrou; o que depende de navegação, rede e tempo real é testado de ponta a ponta.

O workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) roda a cada push e pull request: tipos, lint, testes unitários e build; depois os testes E2E em Chromium no Linux, com o relatório HTML e os traces como artefatos. A regressão visual não roda no CI porque as baselines versionadas são do Windows; um job manual gera as do Linux.

## 9. Decisões de UX

- **Confirmação só com resposta da simulação:** o pedido nasce `pending`; a tela de confirmação e o link do explorador só aparecem quando o estado vira `confirmed`. Confirmado e recusado são terminais.
- **Timeout no envio:** o aviso oferece "Tentar novamente", que reenvia exatamente o mesmo corpo. Se o pedido já tinha sido criado, ele é recuperado.
- **Recibo como snapshot:** o pedido guarda itens, preços, taxa e total do momento da compra; mudanças posteriores no catálogo não o alteram. Hash da transação e link do explorador (Etherscan, Polygonscan ou Solscan, conforme a rede do pedido) são simulados.
- **Conexão da carteira:** vale para a combinação exata de carteira, provedor e rede; mudar qualquer um exige conectar de novo. A API confere a mesma combinação ao receber o pedido.
- **Uma compra por vez:** com um pedido pendente, uma nova confirmação abre esse pedido em vez de criar outro.
- **Ações sem função real** não simulam sucesso: newsletter, login social e "esqueceu a senha" avisam que estão indisponíveis.
- **Animações:** uma única curva de movimento, entradas curtas, destaque de valores alterados. Com `prefers-reduced-motion`, o conteúdo aparece no lugar, sem animação.

## 10. Acessibilidade

- Navegação por teclado com foco visível em todos os controles; link "Pular para o conteúdo".
- Cada tela define o título do documento ([src/lib/page-title.ts](src/lib/page-title.ts)); o detalhe usa o nome do NFT.
- Diálogos e painéis (login, zoom da galeria, filtros no mobile) prendem o foco e o devolvem ao fechar (Radix, via shadcn/ui).
- Campos com `label`, `aria-invalid` e mensagem de erro ligada por `aria-describedby`, inclusive para erros vindos da API.
- Regiões vivas para o resultado da busca, a quantidade, o estado do pedido e os avisos de mutations e de eventos em tempo real.
- Skeletons com shimmer que reservam as dimensões do conteúdo; a área principal tem altura mínima de uma tela para o rodapé não ser empurrado quando os dados chegam.

Ajustes em relação ao layout, feitos por acessibilidade:

| Ajuste | Motivo |
| --- | --- |
| Filtro marcado ganha um sinal de visto, além da cor do layout | O estado marcado não pode depender só da cor do texto |
| Edição esgotada com borda tracejada, texto riscado e "(esgotada)" no nome acessível | Idem; a versão com opacidade não atingia contraste de 4,5:1 |
| Limite por pedido da edição só para leitores de tela enquanto a edição está disponível | O layout não tem essa linha; ela aparece quando a edição esgota |
| Campos nativos invisíveis cobrindo o controle desenhado (filtros, edições, carteiras) | Clique, foco e leitores de tela agem no campo real |

## 11. Desvios do Figma

| Tela | Desvio | Motivo |
| --- | --- | --- |
| Header | Com sessão, "Entrar" vira o menu da conta | O layout mostra "Entrar" até nas telas que exigem login |
| Header, rodapé e menu da conta | Itens sem frame (Criadores, Aprenda, ajuda, Atividade, Lista de interesse, Ofertas, Arquivos baixados, Suporte) são links para páginas simples no mesmo padrão visual | O enunciado as coloca fora da entrega; em vez de texto morto, levam a conteúdo coerente. "Ofertas" declara que não há ofertas nesta versão |
| Início | Hero com três destaques alternados pelos pontos | Os pontos do layout sugerem um carrossel |
| Início | Paginação com "anterior", reticências e última página | O catálogo tem 27 páginas; o layout mostra só 4 |
| Detalhe | As quatro miniaturas mostram a mesma arte, como no layout, mas cada uma leva a imagem principal a um enquadramento diferente | Dá função à galeria sem mudar a aparência |
| Detalhe | Rótulos "Direitos autorais" e "Contrato" na ordem do conteúdo | No arquivo os dois rótulos estão trocados em relação ao texto |
| Detalhe mobile | Tocar na imagem abre a versão ampliada; descrição e relacionados abaixo das informações | O frame mobile não tem botão de zoom nem essas seções |
| Carrinho | Linha mostra também a edição; avisos de indisponibilidade; cupom aplicado vira texto com "Remover cupom" | Estados exigidos pelo enunciado e não desenhados |
| Pagamento | "Endereço da carteira" e "ENS ou carteira secundária" mostram os dados da carteira cadastrada, sem edição; "Usar outra carteira?" alterna entre a principal e a secundária | O enunciado pede o uso das carteiras cadastradas |
| Pagamento | Botão "Conectar carteira" e, depois de conectada, o estado com "Desconectar" | Simulação de conexão, recusa e desconexão, pedida pelo enunciado |
| Pagamento | A primeira opção de "Carteira e rede" é "WalletConnect" | No frame desktop essa linha mostra o selo com as três carteiras; o frame mobile lista WalletConnect, MetaMask e Coinbase Wallet |
| Pagamento mobile | Dados do colecionador e itens num bloco recolhível, abaixo das carteiras | O frame mobile não os mostra, mas o pedido exige esses dados; o bloco abre sozinho se houver erro neles |
| Confirmação | Estados pendente e recusado no mesmo modal; no mobile, cartão em página inteira | O layout só desenha o confirmado, no desktop |
| Perfil | Um único "Salvar", como no layout, que envia os dados do perfil e, se preenchida, a troca de senha | São duas operações da API, cada uma com seus erros |
| Carteiras | "Igual à carteira principal" é uma caixa de seleção que pré-preenche o formulário; "Adicionar" some quando a carteira já existe | No layout é um rádio isolado, ao lado de um formulário vazio |
| Perfil, carteiras e confirmação no mobile | Sem frame: seguem o padrão das telas mobile existentes | Pedido pelo enunciado |
| Títulos das telas mobile | Abaixo de 400 px de largura o título usa 18 px em vez de 20 px | O frame tem 414 px; em 390 px "Pagamento com carteira" quebraria em duas linhas |

### Inconsistências do próprio arquivo

- O ID do token do mesmo item muda entre telas (Violet Nomad: `#0009` no carrinho, `#0314` no pagamento). A aplicação usa um ID por NFT.
- O e-mail do rodapé mostra `contato@email.com`, mas o link do arquivo aponta para outro endereço. O link usa o endereço exibido.
- No detalhe mobile, a edição "1/10" aparece duas vezes; a aplicação mostra 1/1, 1/10, 1/50 e ABERTA.
- A posição da imagem dentro do card varia de um card para outro; a aplicação usa uma só.

### Assets

- Fonte Roboto Mono servida pelo próprio build (`@fontsource-variable/roboto-mono`), sem CDN.
- As quatro artes do arquivo foram convertidas para WebP em 96, 256, 512 e 900 px (`public/nfts/`) e são servidas com `srcset`.
- Os ícones são os SVGs exportados do Figma (`src/assets/icons/`). O ícone "THANK YOU" do recibo foi redesenhado em SVG a partir do frame, porque o original não pôde ser exportado. O fundo decorativo do banner mobile é o mesmo desenho, embutido como SVG.

## 12. Limitações

- A pré-renderização cobre só a variante mobile de duas rotas (início e detalhe do NFT). As demais telas e o desktop são renderizados no cliente.
- Não há backend: os dados vivem no navegador de quem acessa. Limpar os dados do site ou usar `?reset-mocks` volta ao estado inicial.
- O estado da conexão da carteira fica na tela de pagamento; ao recarregar, é preciso conectar de novo.
- O endereço da carteira no pagamento não é editável ali: muda-se na tela de carteiras.
- As baselines da regressão visual são específicas do sistema operacional (as versionadas são do Windows).
- "Ofertas" não tem funcionalidade; Criadores, Aprenda e a central de ajuda têm conteúdo estático.
- As redes sociais do rodapé apontam para a página inicial de cada rede, por não existir perfil da marca.

## 13. Pré-renderização da primeira dobra

A aplicação é uma SPA: sem nada além disso, o HTML chega vazio e a primeira pintura espera todo o JavaScript. No perfil mobile do Lighthouse isso dava LCP de quase 4 s. Para o conteúdo aparecer antes, o build pré-renderiza a primeira dobra das duas rotas auditadas.

```
pnpm build
  tsc -b
  vite build                                   → dist/ (cliente)
  vite build --ssr src/prerender/render.tsx    → o mesmo código, para Node
  node scripts/prerender.mjs                   → dist/index.html e dist/nft/<id>.html
```

| Etapa | Onde | O que faz |
| --- | --- | --- |
| Renderizar | [src/prerender/render.tsx](src/prerender/render.tsx) | Monta o roteador real com histórico em memória e renderiza a rota com `react-dom/server`. No servidor `useIsDesktop` é falso, então sai a variante mobile. Consultas não concluem, exceto o detalhe do NFT, semeado com o que a API simulada devolve num banco novo |
| Gravar | [scripts/prerender.mjs](scripts/prerender.mjs) | Põe o HTML num `<template>` antes de `#root`, sem ids, rótulos ligados e animações de entrada, e acrescenta título e descrição por NFT |
| Mostrar | script embutido no HTML | Antes da primeira pintura, coloca o conteúdo do `<template>` numa camada `#shell` (`inert`, `aria-hidden`) se o endereço for o da página e o viewport for mobile |
| Carregar a aplicação | [src/main.tsx](src/main.tsx) | Espera a camada (e sua imagem principal) ser pintada, com teto de 1,5 s, e só então baixa os mocks e a aplicação |
| Trocar | [src/lib/shell.ts](src/lib/shell.ts) | A aplicação monta por baixo e remove a camada: no início, quando a rota monta; no detalhe, quando a API responde; nas outras rotas, ao terminar de carregar. Há um limite de 8 s no próprio HTML |

Regras que mantêm isso honesto:

- **Mesmo código.** O HTML vem dos componentes e das rotas da aplicação; mudar uma tela muda o que é pré-renderizado no build seguinte.
- **Sem dado velho.** A página inicial pré-renderizada não tem dados (grade em carregamento). A do detalhe tem os dados das fixtures e só é exibida enquanto o banco simulado ainda não existe no navegador — ou seja, na primeira visita, quando a API responderia exatamente aquilo. Depois disso (ou com `?cenario=` na URL) ela é ignorada e a tela começa pelo skeleton, como antes.
- **Sem troca visível.** A camada e a tela real têm o mesmo conteúdo no momento da troca; o que fica abaixo da dobra (promoções, blog, descrição, relacionados) não é pré-renderizado.
- **Sem depender do host.** Se `/nft/<id>` não for servido por `nft/<id>.html`, o fallback entrega `index.html`, o script vê que o endereço não é o da página e não mostra nada: a aplicação funciona como uma SPA comum.

Efeito colateral útil: cada página de NFT tem `<title>` e descrição próprios já no HTML.
