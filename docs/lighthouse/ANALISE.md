# Análise da auditoria Lighthouse

Os números estão em [README.md](README.md) (gerado por `pnpm lighthouse`) e nos relatórios HTML/JSON desta pasta. Este arquivo interpreta os resultados; os valores citados são da execução de 13/10/2026.

## Resultado

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | 98 | 100 | 100 | 100 | 1,75 s | 0 | 79 ms |
| Início | desktop | 99 | 100 | 100 | 100 | 0,89 s | 0 | 0 ms |
| Detalhes do NFT | mobile | 99 | 100 | 100 | 100 | 1,74 s | 0,001 | 56 ms |
| Detalhes do NFT | desktop | 99 | 100 | 100 | 100 | 0,88 s | 0 | 0 ms |

Todas as medianas atingem as metas (Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90), nas duas páginas e nos dois perfis. Em dez medições seguidas no perfil mobile, a nota de performance ficou entre 98 e 100.

## Como o perfil mobile saiu de 82 para 98

Na primeira versão da entrega o perfil mobile marcava 82–83, com LCP simulado de 3,7–4,0 s. O perfil simula rede 4G lenta (RTT de 150 ms, 1,6 Mbps) e CPU quatro vezes mais lenta, e a causa era a arquitetura: o HTML chegava vazio e nada aparecia antes de baixar e executar cerca de 250 kB de JavaScript comprimido (React, roteador, cache, a camada de mocks) e, no detalhe, antes da resposta da API simulada, de onde vem o endereço da imagem.

Os relatórios mostraram qual era o maior elemento de cada tela no celular:

- **Início:** o fundo da barra de navegação inferior (maior que os cards e que a imagem do banner). É estático.
- **Detalhes do NFT:** a imagem da obra. Depende dos dados do NFT.

Nenhum dos dois precisa de JavaScript para ser desenhado. A correção foi **pré-renderizar a primeira dobra mobile no build**:

1. `pnpm build` renderiza, com os próprios componentes e rotas da aplicação (`react-dom/server`), a tela inicial no estado "carregando" e a tela de detalhe de cada um dos 239 NFTs com os dados das fixtures ([src/prerender/render.tsx](../../src/prerender/render.tsx), [scripts/prerender.mjs](../../scripts/prerender.mjs)). Não há HTML escrito à mão.
2. Esse HTML vai dentro de um `<template>` em `dist/index.html` e em `dist/nft/<id>.html`. Um script embutido de poucas linhas o coloca na tela antes da primeira pintura, se o viewport for mobile e o endereço for o da página.
3. A aplicação é carregada depois que essa primeira dobra (com a imagem principal) foi pintada, monta por baixo dela e a remove quando a tela real está pronta: no início, assim que a rota monta (a tela é idêntica: banner e grade em carregamento); no detalhe, quando a resposta da API chega.

O efeito medido: FCP de 2,4 s para 1,2 s e LCP de 3,7–4,0 s para 1,6–1,75 s. O TBT continuou baixo (50–90 ms).

### O que a pré-renderização não faz

- **Não remove nada da página auditada.** Fontes, imagens, MSW, o banco simulado e a conexão Socket.IO carregam como antes; o que mudou foi a ordem (conteúdo primeiro, aplicação depois). A versão publicada é a mesma que a auditada.
- **Não mostra dado desatualizado.** A página inicial pré-renderizada não contém dados (a grade aparece em carregamento). A do detalhe contém nome, imagem, preço e edições das fixtures, que é exatamente o que a API simulada responde num banco recém-criado. Depois da primeira visita o banco simulado passa a existir no navegador e pode divergir das fixtures (um preço alterado, uma edição esgotada); nesse caso o HTML do detalhe não é exibido e vale só a resposta da API. O teste `mobile.spec.ts › primeira dobra pré-renderizada` cobre as duas situações.
- **Não fica interativa nem visível a leitores de tela.** A camada é `inert` e `aria-hidden` até a aplicação assumir; ids e rótulos são retirados para não colidir com os da aplicação.
- **Não vale para o desktop.** Só a variante mobile é gerada. O perfil desktop já atingia 98–99 e segue renderizado no cliente.

### Outras mudanças desta rodada

- Ícones: o SVG de cada ícone era embutido duas vezes no atributo `style` (máscara com e sem prefixo). Passou a ir numa variável CSS, e a regra da máscara fica uma vez só na folha de estilos. Isso reduziu o HTML de uma página de detalhe de 223 kB para 21 kB.
- Header e rodapé não são mais montados abaixo de 1024 px (antes eram montados e escondidos por CSS).
- A imagem principal usa `decoding="sync"`, para entrar no mesmo quadro do texto.

## Histórico: o que já tinha sido feito

- **Deslocamento de layout no detalhe (CLS 0,22 → 0).** A área principal passou a ter altura mínima de uma tela, para o rodapé não aparecer e ser empurrado quando os dados chegam.
- **Acessibilidade no detalhe (94 → 100).** A nota compacta ganhou `role="img"`; a edição esgotada deixou de usar opacidade (contraste 3,96:1) e é indicada por borda tracejada, texto riscado e nome acessível.
- **Bundle dos mocks de 175 kB para 63 kB comprimidos.** O `tough-cookie` do MSW embute a lista de sufixos públicos de domínio (`tldts`, ~128 kB); a simulação não usa cookies e o pacote foi trocado por um substituto mínimo (`src/mocks/tldts-stub.ts`).
- **Mocks e aplicação baixam em paralelo**; o `socket.io-client` é carregado sob demanda.
- **`robots.txt` válido** e banner inicial com uma só variante montada.

### Tentativas que não funcionaram (antes da pré-renderização)

Todas foram medidas com três execuções no perfil mobile e revertidas.

| Tentativa | Resultado | Por quê |
| --- | --- | --- |
| Listar os blocos principais como `<link rel="modulepreload">` | 84 → 80 | Os downloads passaram a disputar banda antes da primeira pintura |
| Registrar o service worker já no HTML | 84 → 80 | O download dos blocos passou a passar pelo worker |
| Renderizar a interface antes de os mocks estarem prontos | 84 → 77 | A inicialização dos mocks passou a concorrer com a primeira renderização |
| `content-visibility: auto` abaixo da dobra | sem mudança | O LCP não dependia do que está fora da tela |

Elas confirmaram que reordenar o JavaScript não resolvia: era preciso que o conteúdo não dependesse dele.

## Condições da auditoria

- Build de produção (`pnpm build`) servido por `vite preview`, sem compressão HTTP. Um host com Brotli reduz o tempo de download em relação ao medido aqui.
- Cenário padrão dos mocks, banco simulado no estado inicial (armazenamento limpo a cada medição, que é a condição de uma primeira visita).
- Três medições por página e perfil; o valor reportado é a mediana, e os relatórios guardados são os da medição mediana em performance. Ambiente e versões das ferramentas estão em [README.md](README.md) e em `summary.json`.
