# Análise da auditoria Lighthouse

Os números estão em [README.md](README.md) (gerado por `pnpm lighthouse`) e nos relatórios HTML/JSON desta pasta. Este arquivo interpreta os resultados; os valores citados são da execução de 13/10/2026.

## Resultado

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | desktop | 99 | 100 | 100 | 100 | 0,5 s | 0,9 s | 0 | 0 ms |
| Detalhes do NFT | desktop | 99 | 100 | 100 | 100 | 0,6 s | 0,9 s | 0 | 0 ms |
| Início | mobile | **84** | 100 | 100 | 100 | 2,2 s | 3,9 s | 0 | 80 ms |
| Detalhes do NFT | mobile | **85** | 100 | 100 | 100 | 2,3 s | 3,7 s | 0 | 70 ms |

Acessibilidade, boas práticas e SEO atingem as metas nas duas páginas e nos dois perfis. Performance atinge a meta no desktop. **No perfil mobile, performance fica em 84–85, abaixo da meta de 90.**

## Por que o mobile fica abaixo de 90

A nota de performance do Lighthouse pesa TBT (30%), LCP (25%), CLS (25%), FCP (10%) e Speed Index (10%). TBT e CLS estão no máximo; o que derruba a nota é o **LCP de 3,7–3,9 s** (nota parcial ≈ 0,5) e, em menor grau, o FCP de 2,2 s.

O perfil mobile simula rede 4G lenta (RTT de 150 ms, 1,6 Mbps) e CPU quatro vezes mais lenta. Nessas condições, a causa é a arquitetura da entrega, não um recurso isolado:

1. **A aplicação é renderizada inteiramente no cliente.** O HTML chega vazio; a primeira pintura só acontece depois de baixar e executar o JavaScript (React, TanStack Router e Query, componentes — cerca de 105 kB comprimidos no bloco principal, mais o bloco da rota). Com CPU 4× mais lenta, só a execução dos scripts soma cerca de 1 s.
2. **O carregamento é uma cadeia:** documento → script de entrada → blocos da aplicação e dos mocks → bloco da rota → resposta da API → imagem. Cada elo custa ao menos uma ida e volta de 150 ms na rede simulada.
3. **O backend roda no navegador.** O enunciado pede que os mocks (MSW) estejam ativos no build de demonstração. Antes da primeira requisição, a página registra o service worker e monta o banco simulado; cada resposta da API tem ainda a latência simulada do cenário padrão (120–380 ms). No detalhe, a imagem do NFT — o elemento de LCP — só pode começar a baixar depois dessa resposta, porque o endereço dela vem dos dados.

Para separar o peso de cada causa, medi a página inicial num build **sem a camada de mocks** (`VITE_ENABLE_MOCKS=false`, três medições, perfil mobile). Sem API o catálogo não carrega, então essa medição serve só de diagnóstico e não entra nos resultados: o FCP ficou nos mesmos 2,2 s. Ou seja, **a primeira pintura é limitada pelo custo de iniciar a própria SPA**, não pelos mocks; os mocks pesam sobre o LCP, por adiarem a chegada dos dados.

## O que foi feito para chegar a estes números

Primeira medição: mobile 84/85, desktop 97 (início) e **87** (detalhe), acessibilidade **94** no detalhe mobile.

- **Deslocamento de layout no detalhe (CLS 0,22 → 0).** Enquanto os dados carregavam, o rodapé aparecia na primeira dobra e era empurrado quando o conteúdo chegava. A área principal passou a ter altura mínima de uma tela. Isso levou o detalhe no desktop de 87 para 99.
- **Acessibilidade no detalhe (94 → 100).** A nota compacta usava `aria-label` num `<p>` sem papel (ignorado por leitores de tela) e passou a ser `role="img"`; a edição esgotada perdia contraste por usar opacidade (3,96:1) e passou a ser indicada só por borda tracejada, texto riscado e nome acessível.
- **Bundle dos mocks de 175 kB para 63 kB comprimidos.** O MSW depende do `tough-cookie`, que embute a lista de sufixos públicos de domínio (`tldts`, ~128 kB). A simulação não usa cookies, então o pacote foi trocado por um substituto mínimo (`src/mocks/tldts-stub.ts`, alias em `vite.config.ts`).
- **Mocks e aplicação baixam em paralelo.** Antes, a aplicação só começava a baixar depois de os mocks estarem ativos. O `socket.io-client`, que precisava dessa ordem, passou a ser carregado sob demanda (`src/realtime/socket.ts`).
- **`robots.txt` válido**, para o SEO não depender do fallback da SPA.

As duas últimas otimizações de carregamento reduziram bytes e idas e voltas, mas **não mudaram a nota mobile**: o LCP simulado continuou em 3,7–3,9 s, o que confirma que o limite é o custo de CPU e a cadeia de inicialização da SPA, não o volume transferido.

Também testei listar os blocos principais como `<link rel="modulepreload">` no HTML. A nota mobile **caiu** de 84 para 80 (FCP de 2,2 s para 3,2 s), porque os downloads passaram a disputar banda antes da primeira pintura. A mudança foi revertida.

## O que fecharia a diferença

Atingir 90 no perfil mobile exigiria pintar conteúdo antes de o JavaScript executar: renderização no servidor ou pré-renderização das rotas públicas, com os dados do catálogo já no HTML. Isso muda a arquitetura (a stack pedida é uma SPA com API simulada no navegador) e ficou fora desta entrega. Com uma API real, o item 3 da lista de causas desaparece e o LCP do detalhe cai junto.

## Condições da auditoria

- Build de produção (`vite build`) servido por `vite preview`, sem compressão HTTP. Um host com Brotli reduz o tempo de download em relação ao medido aqui.
- Cenário padrão dos mocks, banco simulado no estado inicial (armazenamento limpo a cada medição).
- A página é carregada como publicada: fontes, imagens, MSW e a conexão Socket.IO ativos. Nenhuma funcionalidade é desligada para a medição.
- Três medições por página e perfil; o valor reportado é a mediana, e os relatórios guardados são os da medição mediana em performance. Ambiente e versões das ferramentas estão em [README.md](README.md) e em `summary.json`.
