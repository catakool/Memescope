import { NextResponse } from "next/server";
import { TOKEN_REGISTRY } from "@/lib/tokens";
import { getMarkets } from "@/lib/coingecko";
import { getDexDataByAddress } from "@/lib/dexscreener";
import { computeScores } from "@/lib/scoring";
import { CoinRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  // Só pedimos dados de mercado para tokens que já têm um ID CoinGecko conhecido.
  const activeDefs = TOKEN_REGISTRY.filter((t) => t.verified);
  const ids = activeDefs.map((t) => t.coingeckoId);

  const { data: markets, meta: cgMeta } = await getMarkets(ids);

  // Dados on-chain (DexScreener) só são pedidos para tokens com contrato confirmado.
  // Isto evita associar liquidez/volume ao token errado por coincidência de nome.
  const dexResults = await Promise.all(
    activeDefs.map(async (def) => {
      if (!def.contractAddress) return { id: def.coingeckoId, data: null, meta: null };
      const r = await getDexDataByAddress(def.contractAddress, def.chain);
      return { id: def.coingeckoId, data: r.data, meta: r.meta };
    })
  );
  const dexById = new Map(dexResults.map((r) => [r.id, r]));

  const records: (CoinRecord & { scores: ReturnType<typeof computeScores> })[] = activeDefs.map((def) => {
    const market = markets[def.coingeckoId] ?? null;
    const dexEntry = dexById.get(def.coingeckoId);
    const dex = dexEntry?.data ?? null;
    const scores = computeScores(market, dex, null);
    return {
      def,
      market,
      dex,
      meta: {
        coingecko: cgMeta,
        dexscreener:
          dexEntry?.meta ?? { status: "unavailable", lastUpdated: null, source: "dexscreener" },
      },
      scores,
    };
  });

  // Também devolvemos o catálogo de tokens não verificados (ex.: CYBERLEEK) para
  // que a interface os mostre como "pendentes de verificação", sem dados de mercado.
  const pending = TOKEN_REGISTRY.filter((t) => !t.verified);

  return NextResponse.json({
    records,
    pending,
    generatedAt: new Date().toISOString(),
  });
}
