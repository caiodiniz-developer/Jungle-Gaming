# Kurio — Marketplace de NFTs

Implementação do desafio de frontend: um marketplace de NFTs com descoberta, compra e conta do colecionador, em desktop e mobile. Não há backend: a API REST e os eventos em tempo real são simulados no navegador, na camada de rede.

- **Aplicação publicada:** _preencher com a URL do deploy_
- **Arquitetura, contratos e decisões:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Auditoria Lighthouse:** [docs/lighthouse/](docs/lighthouse/README.md) e [análise](docs/lighthouse/ANALISE.md)

## Stack

React 19 · TypeScript · Vite · TanStack Router (rotas por arquivo) · TanStack Query · Axios · Socket.IO (`socket.io-client`) · Tailwind CSS v4 · shadcn/ui · MSW (`msw` + `@mswjs/socket.io-binding`) · Playwright · Lighthouse.

## Setup

Requisitos: Node.js 22 ou mais novo e pnpm 10.

```bash
pnpm install
pnpm dev          # http://localhost:5173, com os mocks ativos
```

A entrega roda a partir de um checkout limpo, sem serviço externo.

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Desenvolvimento com mocks (porta 5173) |
| `pnpm build` | Verifica os tipos e gera o build de produção em `dist/` |
| `pnpm preview` | Serve o build (porta 4173) |
| `pnpm typecheck` | Verificação de tipos |
| `pnpm lint` | ESLint |
| `pnpm test` | Testes unitários (Vitest) |
| `pnpm test:e2e` | Testes Playwright (faz o build e sobe o preview sozinho) |
| `pnpm test:e2e:update` | Regera as baselines da regressão visual |
| `pnpm test:e2e:report` | Abre o relatório HTML da última execução |
| `pnpm lighthouse` | Build + auditoria Lighthouse; grava em `docs/lighthouse/` |

Na primeira vez, instale o navegador dos testes: `pnpm exec playwright install chromium`.

## Variáveis de ambiente

Os valores padrão estão em [.env](.env). Não há segredos.

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Prefixo das rotas REST |
| `VITE_SOCKET_URL` | vazio (mesma origem) | Origem do servidor Socket.IO |
| `VITE_ENABLE_MOCKS` | `true` | Liga a camada de mocks. Com `false`, o código dos mocks nem é baixado |
| `VITE_REQUEST_TIMEOUT` | `10000` | Tempo limite das requisições, em ms |

## Credenciais fictícias

| Conta | E-mail | Senha | Estado inicial |
| --- | --- | --- | --- |
| Colecionador | `colecionador@kurio.test` | `Kurio@123` | Carteiras principal e secundária, dois favoritos |
| Conta vazia | `nova@kurio.test` | `Kurio@456` | Sem carteiras nem favoritos |

Também é possível criar contas em **Criar conta**. Cupons: `KURIO10` (10%), `GENESIS5` (5%) e `EXPIRADO` (vencido). Qualquer outro código é inválido.

## Cenários da simulação

O estado dos mocks (catálogo, contas, carrinho, pedidos) fica no `localStorage` do navegador e sobrevive ao refresh.

- **Selecionar um cenário:** abra qualquer página com `?cenario=<id>`, por exemplo `http://localhost:5173/?cenario=rede-lenta`. O parâmetro é consumido e some da URL; o cenário vale até ser trocado.
- **Restaurar os dados iniciais:** abra qualquer página com `?reset-mocks`. Pode ser combinado: `/?reset-mocks&cenario=padrao`.
- **Pelo console do navegador:** `window.__kurioMocks` expõe os mesmos controles (`setScenario("id")`, `reset()`, `updateNft(...)`, `resolveOrder(...)`, `dropConnections()`, `expireSessions()`…). É a mesma interface usada pelos testes.

| Cenário (`id`) | O que acontece |
| --- | --- |
| `padrao` | Tudo funciona: latência de 120–380 ms, pagamento confirmado em 2,5 s |
| `catalogo-vazio` | A listagem não devolve resultados |
| `rede-lenta` | Toda resposta leva de 2,5 a 3,5 s (skeletons visíveis) |
| `latencia-variavel` | A listagem alterna 1,8 s e 0,15 s: respostas chegam fora de ordem |
| `offline` | Toda requisição falha como erro de rede |
| `erro-servidor` | Catálogo e detalhe respondem 500 |
| `falha-transitoria` | As duas primeiras chamadas ao catálogo respondem 503; a seguinte funciona |
| `sessao-expirada` | A sessão expira 20 s depois do login |
| `falha-favorito` | Favoritar e desfavoritar respondem 500 |
| `carteira-recusada` | A carteira recusa o pedido de conexão |
| `preco-alterado` | O preço do primeiro item sobe no instante do envio do pedido |
| `edicao-esgotada` | A edição do primeiro item esgota no instante do envio do pedido |
| `timeout-pedido` | O pedido é criado, mas a primeira resposta nunca chega |
| `pagamento-recusado` | O pedido é criado e depois recusado |
| `pedido-pendente` | O pedido fica pendente até ser resolvido manualmente |

A latência usa um gerador com semente fixa: a mesma sequência de requisições produz os mesmos atrasos.

## Como reproduzir os fluxos de falha

Em todos, comece com `?reset-mocks&cenario=<id>` e, quando precisar de login, use a conta do colecionador.

| Fluxo | Passos | O que observar |
| --- | --- | --- |
| Catálogo fora do ar | `erro-servidor` → abrir o início | Mensagem de erro com "Tentar novamente". No console, `__kurioMocks.setScenario("padrao")` e clicar no botão recupera a lista |
| Sem conexão | `offline` → abrir o início | "Sem conexão com o servidor" |
| Falha transitória | `falha-transitoria` → abrir o início | A lista aparece sozinha depois de duas tentativas automáticas |
| Respostas fora de ordem | `latencia-variavel` → marcar um filtro e logo outro | A lista final corresponde ao último filtro |
| Favorito com falha | Entrar → `__kurioMocks.setScenario("falha-favorito")` → favoritar um NFT | O coração volta ao estado anterior e aparece o aviso |
| Cupom | No carrinho, aplicar `EXPIRADO` ou um código qualquer | Erro no campo |
| Sessão expirada | Entrar → `__kurioMocks.expireSessions()` → salvar o perfil ou confirmar uma compra | Volta ao login com aviso; após entrar, retorna à mesma tela |
| Carteira recusa | `carteira-recusada` → pagamento → "Conectar carteira" | Mensagem de recusa; o formulário é mantido |
| Preço muda no envio | `preco-alterado` → pagamento → conectar → "Confirmar compra" | Aviso com o preço antigo e o novo; o botão vira "Confirmar com os novos valores" |
| Edição esgota no envio | `edicao-esgotada` → idem | Compra bloqueada, com link para ajustar o carrinho |
| Preço muda em tempo real | Com o carrinho ou o pagamento aberto: `__kurioMocks.updateNft("nft-0009", { price: "2" })` | Aviso, resumo atualizado e, no pagamento, exigência de nova confirmação |
| Timeout após criar o pedido | `timeout-pedido` → confirmar a compra → esperar 10 s | Aviso "Não recebemos a confirmação"; "Tentar novamente" abre o **mesmo** pedido (`__kurioMocks.listOrders()` mostra um só) |
| Pagamento recusado | `pagamento-recusado` → confirmar a compra | Recibo "Pagamento recusado"; o carrinho mantém os itens |
| Pedido pendente | `pedido-pendente` → confirmar a compra | Fica pendente (inclusive após refresh). `__kurioMocks.resolveOrder("ord_0001", "confirmed")` conclui |
| Queda de conexão com pedido pendente | Com o pedido pendente: `__kurioMocks.dropConnections({ refuseNew: true })`, depois `resolveOrder(...)` | O evento se perde; a página se atualiza pela consulta periódica. `restoreConnections()` religa o tempo real |
| Evento duplicado ou antigo | Num detalhe: `updateNft(...)`, depois `replayEvent()` e `emitStaleNftEvent("nft-0009")` | O preço não muda de novo e não há segundo aviso |

## Testes

```bash
pnpm test                                # unitários
pnpm exec playwright install chromium   # uma vez
pnpm test:e2e                            # ponta a ponta
```

### Unitários

60 testes da lógica pura, sem navegador, ao lado do código que testam (`src/**/*.test.ts`):

| Arquivo | Cobre |
| --- | --- |
| `lib/eth.test.ts` | Aritmética de ETH em wei, sem perda de precisão, e formatação |
| `realtime/events.test.ts` | Descarte de eventos duplicados e de versões antigas, por recurso |
| `features/checkout/order-attempt.test.ts` | Quando a chave de idempotência é reusada e quando muda |
| `features/catalog/search.test.ts` | Estado do catálogo na URL e conversão para o contrato REST |
| `features/auth/guards.test.ts` | Destino pós-login (sem redirecionamento aberto) e rotas privadas |
| `mocks/domain/pricing.test.ts` | Cotação da API simulada: cupom, taxa por rede, indisponibilidade, hash; fusão do carrinho do visitante |
| `mocks/config.test.ts` | Determinismo dos cenários: latência com semente, falhas com limite de ocorrências |

### Ponta a ponta

75 testes em Chromium: 66 no viewport desktop (1440 × 900) e 9 no mobile (390 × 844). Cada teste usa um contexto novo do navegador, portanto parte do banco simulado no estado inicial. Os arquivos em [tests/](tests/) seguem os itens do enunciado:

| Arquivo | Cobre |
| --- | --- |
| `catalog.spec.ts` | Busca, filtros combinados, ordenação, paginação, histórico, vazio, respostas fora de ordem |
| `detail.spec.ts` | Acesso direto, NFT inexistente, edição esgotada, limite de quantidade, rota inexistente |
| `auth.spec.ts` | Cadastro, login, expiração (inclusive por relógio), logout, troca de usuário |
| `favorites.spec.ts` | Persistência, falha da mutation com rollback, recuperação |
| `cart.spec.ts` | Quantidades, remoção, cupom, persistência após refresh e login, rollback |
| `checkout.spec.ts` | Compra completa, clique repetido, recusa, timeout com idempotência, preço/estoque no envio, carteira, sessão, snapshot do recibo |
| `account.spec.ts` | Perfil, avatar, senha e carteiras, com erros de validação e da API |
| `realtime.spec.ts` | `nft.updated` e `order.updated`, duplicata, evento antigo, desconexão, reconciliação, pedido pendente |
| `a11y.spec.ts` | Teclado, foco em diálogos, erros associados, semântica, 390/768/1440 px, zoom, movimento reduzido |
| `resilience.spec.ts` | Skeletons em rede lenta, erro e nova tentativa, offline, falha transitória |
| `visual.spec.ts` | Regressão visual de início, detalhe, carrinho e pagamento (desktop e mobile) |
| `mobile.spec.ts` | Filtros em painel, compra completa, barra inferior, conta e pedido no mobile |

Os testes de tempo real só alteram o banco simulado ou derrubam conexões: o evento sai do servidor Socket.IO do mock e chega à página pelo `socket.io-client` da aplicação. Os de REST passam pelos handlers do MSW. Os cenários sensíveis a tempo (timeout do pedido, expiração da sessão) usam o relógio controlado do Playwright.

O relatório HTML fica em `playwright-report/`; falhas guardam trace e screenshot em `test-results/`.

**Regressão visual:** as baselines versionadas em `tests/visual.spec.ts-snapshots/` foram geradas no Windows (sufixo `-win32`). Em outro sistema operacional a renderização de fontes difere e o Playwright pede baselines próprias: rode `pnpm test:e2e:update` uma vez.

## Integração contínua

O workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) roda a cada push e pull request: tipos, lint, testes unitários e build, e depois os testes E2E no Linux. O relatório do Playwright e os traces ficam como artefatos da execução. A regressão visual não entra no CI (as baselines versionadas são do Windows); o job manual `baselines-linux` gera as do Linux.

## Auditoria Lighthouse

```bash
pnpm lighthouse
```

Audita início e detalhe do NFT, nos perfis mobile e desktop, três vezes cada, sobre o build de produção com o cenário padrão dos mocks. A configuração está em [lighthouse.config.mjs](lighthouse.config.mjs). Resultado da última execução (medianas):

| Página | Perfil | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- | --- |
| Início | desktop | 98 | 100 | 100 | 100 |
| Detalhes do NFT | desktop | 98 | 100 | 100 | 100 |
| Início | mobile | 82 | 100 | 100 | 100 |
| Detalhes do NFT | mobile | 83 | 100 | 100 | 100 |

Performance no perfil mobile fica abaixo da meta de 90. As causas, o que foi tentado e o que fecharia a diferença estão em [docs/lighthouse/ANALISE.md](docs/lighthouse/ANALISE.md); LCP, CLS, TBT, ambiente e versões estão em [docs/lighthouse/README.md](docs/lighthouse/README.md).

## Deploy

O projeto é um site estático (`dist/`). Há um [vercel.json](vercel.json) com o build, o fallback das rotas para `index.html` (acesso direto e refresh funcionam em qualquer rota) e o cache dos assets. Na Vercel, basta importar o repositório; nenhuma variável de ambiente é necessária, porque os mocks vêm ligados por padrão.

Em Netlify ou Cloudflare Pages, o equivalente é: comando `pnpm build`, pasta `dist` e uma regra de fallback de `/*` para `/index.html`.

## Estrutura

```
src/
  api/          contratos (tipos), schemas zod e uma função por operação REST
                (os testes unitários ficam ao lado do código: *.test.ts)
  lib/          Axios, variáveis de ambiente, aritmética de ETH, chaves de cache
  realtime/     socket.io-client, filtro de eventos e sincronização com o cache
  features/     catálogo, detalhe, favoritos, carrinho, checkout, pedidos, conta, sessão
  components/   layout (header, rodapé, barra mobile), campos de formulário, shadcn/ui
  routes/       rotas por arquivo (TanStack Router)
  mocks/        MSW: handlers, regras de negócio, banco simulado, cenários, Socket.IO
tests/          Playwright (E2E e regressão visual)
.github/        integração contínua
scripts/        auditoria Lighthouse
docs/           relatórios do Lighthouse
```
