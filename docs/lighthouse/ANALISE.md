# Análise da auditoria Lighthouse

Os números estão em [README.md](README.md) (gerado por `pnpm lighthouse`) e nos relatórios HTML/JSON desta pasta. Este arquivo interpreta os resultados; os valores citados são da execução de 13/10/2026.

## Resultado

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | desktop | 98 | 100 | 100 | 100 | 0,6 s | 0,9 s | 0 | 0 ms |
| Detalhes do NFT | desktop | 98 | 100 | 100 | 100 | 0,6 s | 0,9 s | 0 | 0 ms |
| Início | mobile | **82** | 100 | 100 | 100 | 2,3 s | 3,9 s | 0 | 115 ms |
| Detalhes do NFT | mobile | **83** | 100 | 100 | 100 | 2,3 s | 3,7 s | 0 | 128 ms |

Acessibilidade, boas práticas e SEO atingem as metas nas duas páginas e nos dois perfis. Performance atinge a meta no desktop. **No perfil mobile, performance fica em 82–83, abaixo da meta de 90.** Entre execuções no mesmo código a nota mobile variou de 81 a 85, conforme a carga da máquina no momento (o LCP simulado ficou sempre entre 3,7 e 3,9 s; o que oscila é TBT e Speed Index).

## Por que o mobile fica abaixo de 90

A nota de performance do Lighthouse pesa TBT (30%), LCP (25%), CLS (25%), FCP (10%) e Speed Index (10%). TBT e CLS estão no máximo; o que derruba a nota é o **LCP de 3,7–3,9 s** (nota parcial ≈ 0,5) e, em menor grau, o FCP de 2,2 s.

O perfil mobile simula rede 4G lenta (RTT de 150 ms, 1,6 Mbps) e CPU quatro vezes mais lenta. Nessas condições, a causa é a arquitetura da entrega, não um recurso isolado:

1. **A aplicação é renderizada inteiramente no cliente.** O HTML chega vazio; a primeira pintura só acontece depois de baixar e executar o JavaScript (React, TanStack Router e Query, componentes — cerca de 105 kB comprimidos no bloco principal, mais o bloco da rota). Com CPU 4× mais lenta, só a execução dos scripts soma cerca de 1 s.
2. **O carregamento é uma cadeia:** documento → script de entrada → blocos da aplicação e dos mocks → bloco da rota → resposta da API → imagem. Cada elo custa ao menos uma ida e volta de 150 ms na rede simulada.
3. **O backend roda no navegador.** O enunciado pede que os mocks (MSW) estejam ativos no build de demonstração. Antes da primeira requisição, a página registra o service worker e monta o banco simulado; cada resposta da API tem ainda a latência simulada do cenário padrão (120–380 ms). No detalhe, a imagem do NFT — o elemento de LCP — só pode começar a baixar depois dessa resposta, porque o endereço dela vem dos dados.

Para separar o peso de cada causa, medi a página inicial num build **sem a camada de mocks** (`VITE_ENABLE_MOCKS=false`, três medições, perfil mobile). Sem API o catálogo não carrega, então essa medição serve só de diagnóstico e não entra nos resultados: o FCP ficou nos mesmos 2,2 s. Ou seja, **a primeira pintura é limitada pelo custo de iniciar a própria SPA**, não pelos mocks; os mocks pesam sobre o LCP, por adiarem a chegada dos dados.

## O que foi feito para chegar a estes números

Primeira medição: mobile 84/85, desktop 97 (início) e **87** (detalhe), acessibilidade **94** no detalhe mobile.

- **Deslocamento de layout no detalhe (CLS 0,22 → 0).** Enquanto os dados carregavam, o rodapé aparecia na primeira dobra e era empurrado quando o conteúdo chegava. A área principal passou a ter altura mínima de uma tela. Isso levou o detalhe no desktop de 87 para 98–99.
- **Acessibilidade no detalhe (94 → 100).** A nota compacta usava `aria-label` num `<p>` sem papel (ignorado por leitores de tela) e passou a ser `role="img"`; a edição esgotada perdia contraste por usar opacidade (3,96:1) e passou a ser indicada só por borda tracejada, texto riscado e nome acessível.
- **Bundle dos mocks de 175 kB para 63 kB comprimidos.** O MSW depende do `tough-cookie`, que embute a lista de sufixos públicos de domínio (`tldts`, ~128 kB). A simulação não usa cookies, então o pacote foi trocado por um substituto mínimo (`src/mocks/tldts-stub.ts`, alias em `vite.config.ts`).
- **Mocks e aplicação baixam em paralelo.** Antes, a aplicação só começava a baixar depois de os mocks estarem ativos. O `socket.io-client`, que precisava dessa ordem, passou a ser carregado sob demanda (`src/realtime/socket.ts`).
- **`robots.txt` válido**, para o SEO não depender do fallback da SPA.

As otimizações de carregamento acima reduziram bytes e idas e voltas, mas **não mudaram a nota mobile**: o LCP simulado continuou em 3,7–3,9 s, o que confirma que o limite é o custo de CPU e a cadeia de inicialização da SPA, não o volume transferido.

- **Banner inicial com uma só variante montada.** Desktop e mobile eram renderizados juntos e um ficava oculto por CSS; no celular isso baixava, com prioridade alta, uma imagem de 900 px que não aparecia.

### Tentativas medidas e revertidas

Todas foram medidas com três execuções no perfil mobile; nenhuma melhorou a nota.

| Tentativa | Resultado | Por quê |
| --- | --- | --- |
| Listar os blocos principais como `<link rel="modulepreload">` no HTML | 84 → 80 (FCP 2,2 → 3,2 s) | Os downloads passaram a disputar banda antes da primeira pintura |
| Registrar o service worker já no HTML, antes do JavaScript | 84 → 80 | Com o worker ativo cedo, o download dos blocos passou a passar por ele e atrasou |
| Renderizar a interface antes de os mocks estarem prontos, retendo as requisições no cliente HTTP | 84 → 77 (LCP 3,9 → 4,8 s) | A primeira pintura real adiantou (1,7 → 1,2 s observados), mas a inicialização dos mocks passou a concorrer com ela na thread principal, e a simulação do Lighthouse somou os dois custos |
| O mesmo, iniciando os mocks só depois do primeiro quadro | 77 | Idem: o primeiro quadro com conteúdo ainda saía depois da inicialização dos mocks |
| `content-visibility: auto` nas seções abaixo da dobra | sem mudança (82–83) | O LCP simulado não depende das imagens fora da tela |

A conclusão das medições: o LCP simulado de ~3,9 s corresponde ao tempo de baixar e executar todo o JavaScript necessário para a primeira renderização, sob CPU 4× mais lenta. Reordenar ou adiar partes desse trabalho não o reduz; só tirá-lo do caminho da primeira pintura reduziria.

## O que fecharia a diferença

Atingir 90 no perfil mobile exigiria pintar conteúdo antes de o JavaScript executar: renderização no servidor ou pré-renderização das rotas públicas, com os dados do catálogo já no HTML. Isso muda a arquitetura (a stack pedida é uma SPA com API simulada no navegador) e ficou fora desta entrega. Com uma API real, o item 3 da lista de causas desaparece e o LCP do detalhe cai junto.

## Condições da auditoria

- Build de produção (`vite build`) servido por `vite preview`, sem compressão HTTP. Um host com Brotli reduz o tempo de download em relação ao medido aqui.
- Cenário padrão dos mocks, banco simulado no estado inicial (armazenamento limpo a cada medição).
- A página é carregada como publicada: fontes, imagens, MSW e a conexão Socket.IO ativos. Nenhuma funcionalidade é desligada para a medição.
- Três medições por página e perfil; o valor reportado é a mediana, e os relatórios guardados são os da medição mediana em performance. Ambiente e versões das ferramentas estão em [README.md](README.md) e em `summary.json`.
