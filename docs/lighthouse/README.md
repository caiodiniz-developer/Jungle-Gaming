# Auditoria Lighthouse

Gerado por `pnpm lighthouse` (configuração em `lighthouse.config.mjs`). Não edite: o arquivo é reescrito a cada execução. A análise dos resultados fica em [ANALISE.md](ANALISE.md).

## Medianas (3 medições por página e perfil)

Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | Relatório |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | **82** ⚠ | 100 | 100 | 100 | 3.93 s | 0 | 115 ms | [HTML](inicio-mobile.report.html) |
| Início | desktop | 98 | 100 | 100 | 100 | 0.89 s | 0 | 0 ms | [HTML](inicio-desktop.report.html) |
| Detalhes do NFT | mobile | **83** ⚠ | 100 | 100 | 100 | 3.72 s | 0 | 128 ms | [HTML](detalhe-mobile.report.html) |
| Detalhes do NFT | desktop | 98 | 100 | 100 | 100 | 0.89 s | 0 | 0 ms | [HTML](detalhe-desktop.report.html) |

Abaixo da meta:

- Início (mobile): performance 82 < 90
- Detalhes do NFT (mobile): performance 83 < 90

## Todas as medições

| Página | Perfil | Medição | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | 1 | 82 | 100 | 100 | 100 | 3938 ms | 0 | 118 ms |
| Início | mobile | 2 | 82 | 100 | 100 | 100 | 3930 ms | 0 | 107 ms |
| Início | mobile | 3 | 81 | 100 | 100 | 100 | 3915 ms | 0 | 115 ms |
| Início | desktop | 1 | 98 | 100 | 100 | 100 | 893 ms | 0 | 0 ms |
| Início | desktop | 2 | 98 | 100 | 100 | 100 | 890 ms | 0 | 0 ms |
| Início | desktop | 3 | 99 | 100 | 100 | 100 | 888 ms | 0 | 0 ms |
| Detalhes do NFT | mobile | 1 | 82 | 100 | 100 | 100 | 3722 ms | 0 | 128 ms |
| Detalhes do NFT | mobile | 2 | 83 | 100 | 100 | 100 | 3784 ms | 0 | 98 ms |
| Detalhes do NFT | mobile | 3 | 83 | 100 | 100 | 100 | 3714 ms | 0 | 130 ms |
| Detalhes do NFT | desktop | 1 | 98 | 100 | 100 | 100 | 891 ms | 0 | 0 ms |
| Detalhes do NFT | desktop | 2 | 98 | 100 | 100 | 100 | 894 ms | 0 | 0 ms |
| Detalhes do NFT | desktop | 3 | 99 | 100 | 100 | 100 | 892 ms | 0 | 0 ms |

## Ambiente e condições

| Item | Valor |
| --- | --- |
| Data | 2026-10-13T22:20:39.291Z |
| Lighthouse | 13.5.0 |
| Chrome | Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36 |
| Node.js | v24.13.0 |
| Sistema | Windows_NT 10.0.26200 (x64) |
| CPU | AMD Ryzen 5 5500                                × 12 |
| Memória | 16 GB |
| Benchmark index do Lighthouse | 2402 |
| Servidor | vite preview (build de produção, sem compressão) |
| Dados | cenário padrão (latência simulada de 120–380 ms por requisição) |
| Perfil mobile | padrão do Lighthouse: Moto G Power emulado, rede 4G lenta simulada (RTT 150 ms, 1,6 Mbps), CPU 4× mais lenta |
| Perfil desktop | preset `desktop` do Lighthouse: 1350 × 940, rede 40 ms / 10 Mbps, CPU sem redução |

A auditoria carrega a aplicação inteira, como publicada: fontes, imagens, a camada de mocks (MSW) e a conexão Socket.IO. Nada é desligado para a medição.
