"use client";

import { useMemo, useState, useEffect } from "react";
import { useCoins } from "@/hooks/useCoins";
import { getWatchlist, toggleWatchlist } from "@/lib/watchlist";
import Header from "@/components/Header";
import TickerTape from "@/components/TickerTape";
import Disclaimer from "@/components/Disclaimer";
import MarketSummary from "@/components/MarketSummary";
import Filters, { DEFAULT_FILTERS, FilterState } from "@/components/Filters";
import CoinCard from "@/components/CoinCard";
import CoinTable from "@/components/CoinTable";
import MomentumHeatmap from "@/components/MomentumHeatmap";
import PerformanceCompare from "@/components/PerformanceCompare";
import AlertsPanel from "@/components/AlertsPanel";
import AddTokenPanel from "@/components/AddTokenPanel";
import CoinDetailModal from "@/components/CoinDetailModal";
import { TIER_META } from "@/lib/tiers";

type ViewMode = "cards" | "table";

export default function Home() {
  const { data, error, loading } = useCoins();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>("cards");
  const [openCoin, setOpenCoin] = useState<string | null>(null);

  useEffect(() => {
    setWatchlist(getWatchlist());
  }, []);

  const records = data?.records ?? [];

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filters.watchlistOnly && !watchlist.includes(r.def.coingeckoId)) return false;
      if (filters.chain !== "all" && r.def.chain !== filters.chain) return false;
      if (filters.tier !== "all" && r.def.riskTier !== filters.tier) return false;
      if (filters.minMarketCap > 0 && (r.market?.marketCap ?? 0) < filters.minMarketCap) return false;
      if (filters.minLiquidity > 0 && (r.dex?.liquidityUsd ?? 0) < filters.minLiquidity) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!r.def.name.toLowerCase().includes(q) && !r.def.symbol.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [records, filters, watchlist]);

  return (
    <div className="flex-1 flex flex-col">
      <Header generatedAt={data?.generatedAt ?? null} cgMeta={records[0]?.meta.coingecko ?? null} />
      <TickerTape records={records} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Disclaimer />

        {error && (
          <div className="rounded-lg border border-[var(--accent-risk)]/40 bg-[var(--accent-risk-dim)] text-[var(--accent-risk)] text-sm px-4 py-2.5">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="text-sm text-[var(--text-muted)]">A carregar dados de mercado…</div>
        )}

        {data && (
          <>
            <MarketSummary records={records} />

            {data.pending.length > 0 && (
              <div className="rounded-xl border border-[var(--accent-gold)]/30 bg-[var(--surface)] p-4 text-sm">
                <span className="text-[var(--accent-gold)] font-medium">Pendentes de verificação: </span>
                {data.pending.map((p) => (
                  <span key={p.coingeckoId} className="text-[var(--text-muted)]">
                    {p.symbol} ({TIER_META[p.riskTier].label}){" "}
                  </span>
                ))}
                — sem dados ao vivo até o endereço do contrato ser confirmado (ver painel abaixo).
              </div>
            )}

            <Filters value={filters} onChange={setFilters} />

            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-sm text-[var(--text-muted)]">
                {filtered.length} de {records.length} moedas
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setView("cards")}
                  className={`text-xs px-2.5 py-1 rounded-md border ${
                    view === "cards" ? "border-[var(--accent-opportunity)] text-[var(--accent-opportunity)]" : "border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  Cartões
                </button>
                <button
                  onClick={() => setView("table")}
                  className={`text-xs px-2.5 py-1 rounded-md border ${
                    view === "table" ? "border-[var(--accent-opportunity)] text-[var(--accent-opportunity)]" : "border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  Tabela
                </button>
              </div>
            </div>

            {view === "cards" ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((r) => (
                  <CoinCard
                    key={r.def.coingeckoId}
                    record={r}
                    starred={watchlist.includes(r.def.coingeckoId)}
                    onToggleStar={() => setWatchlist(toggleWatchlist(r.def.coingeckoId))}
                    onOpen={() => setOpenCoin(r.def.coingeckoId)}
                  />
                ))}
              </div>
            ) : (
              <CoinTable records={filtered} onOpen={setOpenCoin} />
            )}

            <div className="grid lg:grid-cols-2 gap-4">
              <MomentumHeatmap records={filtered} />
              <PerformanceCompare records={filtered} />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <AlertsPanel records={records} />
              <AddTokenPanel />
            </div>
          </>
        )}
      </main>

      <footer className="px-4 sm:px-6 py-6 text-center text-xs text-[var(--text-faint)]">
        MemeScope — dados via CoinGecko e DexScreener. Não é aconselhamento financeiro.
      </footer>

      {openCoin && <CoinDetailModal coinId={openCoin} onClose={() => setOpenCoin(null)} />}
    </div>
  );
}
