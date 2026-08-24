import { MarketData, SourceMeta } from "./types";
import { cacheGet, cacheGetStale, cacheSet, withCoalescing } from "./cache";

const BASE = "https://api.coingecko.com/api/v3";
const API_KEY = process.env.COINGECKO_API_KEY; // opcional, plano demo/pro

// TTLs pensados para respeitar o limite gratuito da CoinGecko (~10-30 pedidos/min).
const MARKETS_TTL_MS = 45_000;
const CHART_TTL_MS = 60_000;
const STALE_AFTER_MS = 120_000; // acima disto, o estado passa a "stale" no UI

function headers(): HeadersInit {
  const h: Record<string, string> = { accept: "application/json" };
  if (API_KEY) h["x-cg-demo-api-key"] = API_KEY;
  return h;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!res.ok) {
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(`COINGECKO_HTTP_${res.status}`);
  }
  return (await res.json()) as T;
}

function toSourceMeta(storedAt: number | null, ok: boolean): SourceMeta {
  if (!ok && storedAt === null) {
    return { status: "unavailable", lastUpdated: null, source: "coingecko" };
  }
  const age = storedAt !== null ? Date.now() - storedAt : Infinity;
  return {
    status: age > STALE_AFTER_MS ? "stale" : "live",
    lastUpdated: storedAt ? new Date(storedAt).toISOString() : null,
    source: ok ? "coingecko" : "cache",
  };
}

interface RawMarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  market_cap: number | null;
  fully_diluted_valuation: number | null;
  total_volume: number | null;
  price_change_percentage_1h_in_currency: number | null;
  price_change_percentage_24h_in_currency: number | null;
  price_change_percentage_7d_in_currency: number | null;
  price_change_percentage_30d_in_currency: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  ath: number | null;
  ath_change_percentage: number | null;
  last_updated: string | null;
}

function mapCoin(c: RawMarketCoin): MarketData {
  return {
    id: c.id,
    symbol: c.symbol?.toUpperCase() ?? "",
    name: c.name,
    image: c.image ?? null,
    price: c.current_price ?? null,
    marketCap: c.market_cap ?? null,
    fdv: c.fully_diluted_valuation ?? null,
    volume24h: c.total_volume ?? null,
    change1h: c.price_change_percentage_1h_in_currency ?? null,
    change24h: c.price_change_percentage_24h_in_currency ?? null,
    change7d: c.price_change_percentage_7d_in_currency ?? null,
    change30d: c.price_change_percentage_30d_in_currency ?? null,
    circulatingSupply: c.circulating_supply ?? null,
    totalSupply: c.total_supply ?? null,
    ath: c.ath ?? null,
    athChangePercent: c.ath_change_percentage ?? null,
    lastUpdated: c.last_updated ?? null,
  };
}

/** Obtém dados de mercado para uma lista de coingeckoIds, com cache partilhada. */
export async function getMarkets(
  ids: string[]
): Promise<{ data: Record<string, MarketData>; meta: SourceMeta }> {
  const key = `markets:${ids.slice().sort().join(",")}`;
  const cached = cacheGet<Record<string, MarketData>>(key);
  if (cached) {
    return { data: cached.value, meta: toSourceMeta(cached.storedAt, false) };
  }

  return withCoalescing(key, async () => {
    try {
      const url =
        `${BASE}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids.join(","))}` +
        `&price_change_percentage=1h,24h,7d,30d&per_page=250&page=1&sparkline=false`;
      const raw = await fetchJson<RawMarketCoin[]>(url);
      const data: Record<string, MarketData> = {};
      for (const c of raw) data[c.id] = mapCoin(c);
      cacheSet(key, data, MARKETS_TTL_MS);
      return { data, meta: toSourceMeta(Date.now(), true) };
    } catch (err) {
      const stale = cacheGetStale<Record<string, MarketData>>(key);
      if (stale) {
        return { data: stale.value, meta: toSourceMeta(stale.storedAt, false) };
      }
      return { data: {}, meta: { status: "unavailable", lastUpdated: null, source: "coingecko" } };
    }
  });
}

export interface PricePoint {
  t: number; // epoch ms
  price: number;
}
export interface VolumePoint {
  t: number;
  volume: number;
}

export interface MarketChart {
  prices: PricePoint[];
  volumes: VolumePoint[];
}

/** Histórico de preço/volume (usado no gráfico de preço e no gráfico preço x volume). */
export async function getMarketChart(
  id: string,
  days: number | "max" = 30
): Promise<{ data: MarketChart | null; meta: SourceMeta }> {
  const key = `chart:${id}:${days}`;
  const cached = cacheGet<MarketChart>(key);
  if (cached) return { data: cached.value, meta: toSourceMeta(cached.storedAt, false) };

  return withCoalescing(key, async () => {
    try {
      const url = `${BASE}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`;
      const raw = await fetchJson<{ prices: [number, number][]; total_volumes: [number, number][] }>(
        url
      );
      const data: MarketChart = {
        prices: raw.prices.map(([t, price]) => ({ t, price })),
        volumes: raw.total_volumes.map(([t, volume]) => ({ t, volume })),
      };
      cacheSet(key, data, CHART_TTL_MS);
      return { data, meta: toSourceMeta(Date.now(), true) };
    } catch {
      const stale = cacheGetStale<MarketChart>(key);
      if (stale) return { data: stale.value, meta: toSourceMeta(stale.storedAt, false) };
      return { data: null, meta: { status: "unavailable", lastUpdated: null, source: "coingecko" } };
    }
  });
}
