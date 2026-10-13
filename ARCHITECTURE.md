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
| Pedidos | `POST /orders` | Cabeçalho `Idempotency-Key` obrigatório. 202 (criado, pendente) ou 200 (mesma tentativa) |
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
| Falha transitória | 503 `SERVICE_UNAVAILABLE`, 500 `INTERNAL_ERROR` |

No cliente, o interceptor do Axios converte qualquer falha — resposta 4xx/5xx, rede, timeout, cancelamento — em um `ApiError` ([src/lib/http.ts](src/lib/http.ts)) com `code` estável. A interface decide o que mostrar pelo `code`, nunca pelo texto.

### Valores em ETH

Valores trafegam como strings decimais (`"1.19"`). Para calcular, são convertidos para wei em `bigint` ([src/lib/eth.ts](src/lib/eth.ts)); nunca passam por `number`. A interface não soma nem multiplica valores: subtotal, desconto, taxa e total vêm sempre da cotação da API. Quantidades são inteiras.

### Idempotência do pedido

O cliente gera uma `Idempotency-Key` por **tentativa de compra** e a guarda no `sessionStorage` junto com o corpo do pedido ([src/features/checkout/order-attempt.ts](src/features/checkout/order-attempt.ts)). Enquanto o corpo for o mesmo — clique repetido, nova tentativa após timeout ou falha de rede, refresh — a mesma chave é reenviada e a API devolve o pedido já criado. Corpo diferente (nova cotação, outra carteira) recebe chave nova. No mock, a mesma chave com corpo diferente responde 409 `IDEMPOTENCY_CONFLICT`.

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
- **Isolamento por usuário:** eventos privados só são entregues a conexões que fizeram `session.join` com o token do dono. No cliente, a troca de sessão zera o filtro de eventos e as chaves de cache privadas.
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
- **Persistência e reset:** o banco simulado e a configuração do cenário ficam no `localStorage`. `?reset-mocks` (ou `__kurioMocks.reset()`) recria tudo a partir das fixtures, que são determinísticas (gerador com semente fixa).
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

## 8. Decisões de UX

- **Confirmação só com resposta da simulação:** o pedido nasce `pending`; a tela de confirmação e o link do explorador só aparecem quando o estado vira `confirmed`. Confirmado e recusado são terminais.
- **Timeout no envio:** o aviso oferece "Tentar novamente", que reenvia exatamente o mesmo corpo. Se o pedido já tinha sido criado, ele é recuperado.
- **Recibo como snapshot:** o pedido guarda itens, preços, taxa e total do momento da compra; mudanças posteriores no catálogo não o alteram. Hash da transação e link do Etherscan são simulados.
- **Conexão da carteira:** vale para a combinação exata de carteira, provedor e rede; mudar qualquer um exige conectar de novo.
- **Ações sem função real** não simulam sucesso: newsletter, login social e "esqueceu a senha" avisam que estão indisponíveis.
- **Animações:** uma única curva de movimento, entradas curtas, destaque de valores alterados. Com `prefers-reduced-motion`, o conteúdo aparece no lugar, sem animação.

## 9. Acessibilidade

- Navegação por teclado com foco visível em todos os controles; link "Pular para o conteúdo".
- Diálogos e painéis (login, zoom da galeria, filtros no mobile) prendem o foco e o devolvem ao fechar (Radix, via shadcn/ui).
- Campos com `label`, `aria-invalid` e mensagem de erro ligada por `aria-describedby`, inclusive para erros vindos da API.
- Regiões vivas para o resultado da busca, a quantidade, o estado do pedido e os avisos de mutations e de eventos em tempo real.
- Skeletons com shimmer que reservam as dimensões do conteúdo; a área principal tem altura mínima de uma tela para o rodapé não ser empurrado quando os dados chegam.

Ajustes em relação ao layout, feitos por acessibilidade:

| Ajuste | Motivo |
| --- | --- |
| Filtros com caixa de seleção visível | O estado marcado não pode depender só da cor do texto |
| Edição esgotada com borda tracejada, texto riscado e "(esgotada)" no nome acessível | Idem; a versão com opacidade não atingia contraste de 4,5:1 |
| Campos nativos invisíveis cobrindo o controle desenhado (filtros, edições, carteiras) | Clique, foco e leitores de tela agem no campo real |
| Paginação com "anterior" e reticências | O catálogo tem 27 páginas; o layout mostra só 4 |

## 10. Desvios do Figma

| Tela | Desvio | Motivo |
| --- | --- | --- |
| Header | Com sessão, "Entrar" vira o menu da conta | O layout mostra "Entrar" até nas telas que exigem login |
| Header, rodapé e menu da conta | Itens sem frame (Criadores, Aprenda, ajuda, Atividade, Lista de interesse, Ofertas, Arquivos baixados, Suporte) são links para páginas simples no mesmo padrão visual | O enunciado as coloca fora da entrega; em vez de texto morto, levam a conteúdo coerente. "Ofertas" declara que não há ofertas nesta versão |
| Início | Hero com três destaques alternados pelos pontos | Os pontos do layout sugerem um carrossel |
| Detalhe | Miniaturas com enquadramentos diferentes da mesma arte | O arquivo usa a mesma imagem nas quatro; assim a galeria tem função |
| Detalhe | Linha de disponibilidade sob as edições | Mostra o limite por pedido e a edição esgotada |
| Detalhe | Rótulos "Direitos autorais" e "Contrato" na ordem do conteúdo | No arquivo os dois rótulos estão trocados em relação ao texto |
| Detalhe mobile | Miniaturas no lugar dos pontos; descrição e relacionados abaixo das informações | Sem frame para essas partes |
| Carrinho | Linha mostra também a edição; avisos de indisponibilidade; cupom aplicado vira texto com "Remover cupom" | Estados exigidos pelo enunciado e não desenhados |
| Pagamento | "Endereço da carteira", "Tipo de carteira" e "Usar outra carteira?" viraram a escolha entre as carteiras cadastradas, com "Conectar carteira" e "Desconectar" | O enunciado pede o uso das carteiras cadastradas e a simulação de conexão, recusa e desconexão |
| Pagamento mobile | Mesma estrutura do desktop, empilhada | O frame mobile mostra só carteiras, provedor e total; o pedido exige os dados do colecionador |
| Confirmação | Cartão na página, com header e rodapé; estados pendente e recusado | No layout é um modal sobre fundo vazio e só há o estado confirmado |
| Perfil | "Salvar" (dados) e "Alterar senha" são formulários separados | São operações distintas da API, com erros próprios |
| Carteiras | "Igual à carteira principal" é uma caixa de seleção que pré-preenche o formulário | No layout é um rádio isolado |
| Perfil, carteiras e confirmação no mobile | Sem frame: seguem o padrão das telas mobile existentes | Pedido pelo enunciado |

### Inconsistências do próprio arquivo

- O ID do token do mesmo item muda entre telas (Violet Nomad: `#0009` no carrinho, `#0314` no pagamento). A aplicação usa um ID por NFT.
- O e-mail do rodapé mostra `contato@email.com`, mas o link do arquivo aponta para outro endereço. O link usa o endereço exibido.
- No detalhe mobile, a edição "1/10" aparece duas vezes; a aplicação mostra 1/1, 1/10, 1/50 e ABERTA.
- A posição da imagem dentro do card varia de um card para outro; a aplicação usa uma só.

### Assets

- Fonte Roboto Mono servida pelo próprio build (`@fontsource-variable/roboto-mono`), sem CDN.
- As quatro artes do arquivo foram convertidas para WebP em 96, 256, 512 e 900 px (`public/nfts/`) e são servidas com `srcset`.
- Os ícones são os SVGs exportados do Figma (`src/assets/icons/`). O ícone "THANK YOU" do recibo foi redesenhado em SVG a partir do frame, porque o original não pôde ser exportado. O fundo decorativo do banner mobile é o mesmo desenho, embutido como SVG.

## 11. Limitações

- **Performance no perfil mobile do Lighthouse fica em 84–85**, abaixo da meta de 90. Causas e tentativas em [docs/lighthouse/ANALISE.md](docs/lighthouse/ANALISE.md).
- Não há backend: os dados vivem no navegador de quem acessa. Limpar os dados do site ou usar `?reset-mocks` volta ao estado inicial.
- O estado da conexão da carteira fica na tela de pagamento; ao recarregar, é preciso conectar de novo.
- As baselines da regressão visual são específicas do sistema operacional (as versionadas são do Windows).
- "Ofertas" não tem funcionalidade; Criadores, Aprenda e a central de ajuda têm conteúdo estático.
- As redes sociais do rodapé apontam para a página inicial de cada rede, por não existir perfil da marca.
