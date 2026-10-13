# Auditoria Lighthouse

Gerado por `pnpm lighthouse` (configuração em `lighthouse.config.mjs`). Não edite: o arquivo é reescrito a cada execução. A análise dos resultados fica em [ANALISE.md](ANALISE.md).

## Medianas (3 medições por página e perfil)

Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | Relatório |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | **84** ⚠ | 100 | 100 | 100 | 3.90 s | 0 | 80 ms | [HTML](inicio-mobile.report.html) |
| Início | desktop | 99 | 100 | 100 | 100 | 0.88 s | 0 | 0 ms | [HTML](inicio-desktop.report.html) |
| Detalhes do NFT | mobile | **85** ⚠ | 100 | 100 | 100 | 3.66 s | 0 | 73 ms | [HTML](detalhe-mobile.report.html) |
| Detalhes do NFT | desktop | 99 | 100 | 100 | 100 | 0.87 s | 0 | 0 ms | [HTML](detalhe-desktop.report.html) |

Abaixo da meta:

- Início (mobile): performance 84 < 90
- Detalhes do NFT (mobile): performance 85 < 90

## Todas as medições

| Página | Perfil | Medição | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | 1 | 84 | 100 | 100 | 100 | 3913 ms | 0 | 80 ms |
| Início | mobile | 2 | 84 | 100 | 100 | 100 | 3895 ms | 0 | 68 ms |
| Início | mobile | 3 | 84 | 100 | 100 | 100 | 3903 ms | 0 | 82 ms |
| Início | desktop | 1 | 99 | 100 | 100 | 100 | 878 ms | 0 | 0 ms |
| Início | desktop | 2 | 99 | 100 | 100 | 100 | 876 ms | 0 | 0 ms |
| Início | desktop | 3 | 98 | 100 | 100 | 100 | 870 ms | 0 | 0 ms |
| Detalhes do NFT | mobile | 1 | 84 | 100 | 100 | 100 | 3658 ms | 0 | 72 ms |
| Detalhes do NFT | mobile | 2 | 85 | 100 | 100 | 100 | 3662 ms | 0 | 73 ms |
| Detalhes do NFT | mobile | 3 | 85 | 100 | 100 | 100 | 3662 ms | 0 | 73 ms |
| Detalhes do NFT | desktop | 1 | 99 | 100 | 100 | 100 | 873 ms | 0 | 0 ms |
| Detalhes do NFT | desktop | 2 | 99 | 100 | 100 | 100 | 879 ms | 0 | 0 ms |
| Detalhes do NFT | desktop | 3 | 98 | 100 | 100 | 100 | 867 ms | 0 | 0 ms |

## Ambiente e condições

| Item | Valor |
| --- | --- |
| Data | 2026-10-13T21:37:20.355Z |
| Lighthouse | 13.5.0 |
| Chrome | Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36 |
| Node.js | v24.13.0 |
| Sistema | Windows_NT 10.0.26200 (x64) |
| CPU | AMD Ryzen 5 5500                                × 12 |
| Memória | 16 GB |
| Benchmark index do Lighthouse | 2387.5 |
| Servidor | vite preview (build de produção, sem compressão) |
| Dados | cenário padrão (latência simulada de 120–380 ms por requisição) |
| Perfil mobile | padrão do Lighthouse: Moto G Power emulado, rede 4G lenta simulada (RTT 150 ms, 1,6 Mbps), CPU 4× mais lenta |
| Perfil desktop | preset `desktop` do Lighthouse: 1350 × 940, rede 40 ms / 10 Mbps, CPU sem redução |

A auditoria carrega a aplicação inteira, como publicada: fontes, imagens, a camada de mocks (MSW) e a conexão Socket.IO. Nada é desligado para a medição.

> Falta o arquivo ANALISE.md com a interpretação dos resultados.
