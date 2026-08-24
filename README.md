# MemeScope

Dashboard educativo para acompanhar, analisar e comparar memecoins. Apresenta dados
de mercado (CoinGecko) e dados on-chain de liquidez/volume (DexScreener), calcula
duas pontuações transparentes — **Opportunity Score** e **Risk Score** — e permite
criar alertas locais com notificações do navegador.

> Esta aplicação apresenta dados e indicadores educativos. Não constitui aconselhamento
> financeiro. As memecoins são ativos altamente especulativos e podem perder todo o seu valor.

---

## 1. Arquitetura

```
Browser (Next.js App Router, client components)
        │
        ├── /api/coins            → agrega mercado + on-chain para toda a watchlist
        ├── /api/coins/[id]       → detalhe + histórico de preço/volume de uma moeda
        └── /api/verify-token     → valida um endereço de contrato via DexScreener
                │
                ├── lib/coingecko.ts   (fetch + cache TTL + fallback obsoleto)
                └── lib/dexscreener.ts (fetch + cache TTL + fallback obsoleto)
```

- As chamadas às APIs externas correm **sempre no servidor** (rotas `/api/*`), nunca
  diretamente do browser — isto protege eventuais chaves de API e evita problemas de CORS.
- Uma cache em memória (`lib/cache.ts`) com TTL curto (30–60s) e *request coalescing*
  reduz o número de pedidos às APIs externas e respeita os seus limites de taxa.
- Se uma API externa falhar, a app tenta devolver o último valor em cache (marcado
  como "dados atrasados") antes de assumir "API indisponível". **Nunca inventa valores.**

## 2. Estrutura de pastas

```
src/
  app/
    layout.tsx, globals.css, page.tsx      → layout raiz e dashboard principal
    api/coins/route.ts                     → lista agregada
    api/coins/[id]/route.ts                → detalhe de uma moeda
    api/verify-token/route.ts              → verificação de contrato
  components/                              → UI (cartões, gráficos, tabela, alertas…)
  hooks/useCoins.ts                        → polling client-side + avaliação de alertas
  lib/
    types.ts        → tipos partilhados
    tokens.ts        → watchlist inicial (registo estático)
    coingecko.ts / dexscreener.ts          → wrappers das APIs externas
    scoring.ts        → fórmulas do Opportunity Score e Risk Score
    alerts.ts / watchlist.ts               → localStorage (regras, watchlist, tokens custom)
    format.ts / tiers.ts                   → helpers de formatação e metadados visuais
```

## 3. Modelo de dados

- `TokenDefinition` — entrada estática do catálogo (id CoinGecko, símbolo, chain,
  endereço de contrato, nível de risco, `verified: boolean`).
- `MarketData` — preço, capitalização, FDV, volume, variações 1h/24h/7d/30d (CoinGecko).
- `DexPairData` — par, liquidez, volume on-chain, compradores/vendedores, idade do par
  (DexScreener), **só é pedido quando existe um endereço de contrato confirmado**.
- `ScoreResult` — pontuação 0–100, `confidence` (fração do peso da fórmula com dados
  reais) e a lista de `components` (cada um com peso, valor e disponibilidade).

### CYBERLEEK e tokens de risco extremo

`CYBERLEEK` está no catálogo com `verified: false` e `contractAddress: null`. A
aplicação **nunca** pede dados de mercado ou on-chain para um token não verificado.
Para o ativar (ou adicionar qualquer outro token de risco extremo), use o painel
"Adicionar token de risco extremo" no dashboard: cole o endereço do contrato copiado
da fonte oficial do projeto, confirme os dados devolvidos pela DexScreener e só depois
o token passa a ser acompanhado. Isto evita seguir clones ou impostores com o mesmo
nome/símbolo — a app nunca identifica um token apenas por nome ou símbolo.

## 4. Fórmula das pontuações

Ambas as pontuações são uma **média ponderada apenas dos componentes com dados reais
disponíveis** (o peso dos componentes em falta é excluído do denominador). A
`confidence` reportada é a fração do peso total da fórmula coberta por dados reais.

### Opportunity Score (pesos)
| Componente | Peso | Fonte |
|---|---|---|
| Momentum 1h / 24h / 7d / 30d | 8% / 15% / 13% / 9% | CoinGecko |
| Crescimento de volume | 12% | CoinGecko (histórico) |
| Volume / Capitalização | 10% | CoinGecko |
| Crescimento de liquidez | 8% | não implementado (requer snapshots históricos) |
| Compradores vs. vendedores 24h | 10% | DexScreener |
| Consistência da tendência | 10% | CoinGecko (histórico) |
| Interesse social | 5% | não implementado (sem fonte verificável integrada) |

### Risk Score (pesos, quanto mais alto mais arriscado)
| Componente | Peso | Fonte |
|---|---|---|
| Liquidez reduzida | 15% | DexScreener + CoinGecko |
| Concentração de holders | 12% | não implementado |
| Diferença Cap./FDV | 13% | CoinGecko |
| Idade do token | 10% | DexScreener |
| Liquidez não bloqueada | 8% | não implementado |
| Mint/freeze authority ativa | 10% | não implementado (requer RPC on-chain) |
| Movimentos da carteira do criador | 8% | não implementado |
| Contrato não verificado | 7% | não implementado (requer explorador de blockchain) |
| Possível volume artificial | 9% | DexScreener (heurística volume/liquidez) |
| Honeypot / taxas anormais | 3% | não implementado (ex.: honeypot.is) |
| Quedas abruptas / volatilidade | 5% | CoinGecko (heurística) |

Os componentes marcados "não implementado" aparecem na interface como **"não
disponível"** e reduzem a `confidence` da pontuação — nunca são preenchidos com
valores inventados.

## 5. Fontes de dados e limitações

- **CoinGecko** (`/coins/markets`, `/coins/{id}/market_chart`): plano gratuito sem
  chave tem limites de taxa baixos (variam, tipicamente 10–30 pedidos/min). Defina
  `COINGECKO_API_KEY` no `.env.local` para usar um plano Demo/Pro com limites maiores.
- **DexScreener** (`/latest/dex/tokens/{address}`): gratuito, sem chave, ~300
  pedidos/min. Não expõe estado de bloqueio de liquidez, autoridade de mint/freeze,
  concentração de holders nem verificação de contrato — daí esses componentes
  ficarem sempre "não disponíveis" nesta versão.
- Tokens sem `contractAddress` confirmado no registo (ex.: DOGE, que não vive num
  contrato) não têm dados on-chain — os componentes de risco dependentes de
  liquidez/idade do par ficam "não disponíveis" para esses casos.

## 6. Instalação e arranque local

Requisitos: Node.js 20+.

```bash
npm install
cp .env.example .env.local   # opcional: adicionar COINGECKO_API_KEY
npm run dev                   # http://localhost:3000
```

Para produção:

```bash
npm run build
npm run start
```

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `COINGECKO_API_KEY` | Não | Chave do plano Demo/Pro da CoinGecko, para limites de taxa mais altos. |

## 7. Notas de segurança

- Não há ligação de carteiras, pedido de seed phrases nem execução de transações —
  os alertas usam apenas notificações do navegador (`Notification API`).
- Todos os textos evitam linguagem de aconselhamento financeiro ("compra agora",
  "lucro garantido"); usa-se sempre linguagem condicional ("condições favoráveis",
  "momentum elevado", "risco elevado").
- Dados simulados **não são usados** nesta versão — quando uma API falha, a app
  mostra o último valor real em cache com o estado "dados atrasados" ou, na
  ausência de qualquer valor anterior, "API indisponível". Nunca inventa números.
