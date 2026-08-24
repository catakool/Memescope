import { NextRequest, NextResponse } from "next/server";
import { getTokenDef } from "@/lib/tokens";
import { getMarkets, getMarketChart } from "@/lib/coingecko";
import { getDexDataByAddress } from "@/lib/dexscreener";
import { computeScores } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const def = getTokenDef(id);
  if (!def || !def.verified) {
    return NextResponse.json(
      { error: "Token não encontrado ou ainda não verificado." },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const days = searchParams.get("days") ?? "30";

  const [{ data: markets, meta: cgMeta }, chartRes, dexRes] = await Promise.all([
    getMarkets([def.coingeckoId]),
    getMarketChart(def.coingeckoId, days === "max" ? "max" : Number(days)),
    def.contractAddress
      ? getDexDataByAddress(def.contractAddress, def.chain)
      : Promise.resolve({ data: null, meta: { status: "unavailable" as const, lastUpdated: null, source: "dexscreener" as const } }),
  ]);

  const market = markets[def.coingeckoId] ?? null;
  const scores = computeScores(market, dexRes.data, chartRes.data);

  return NextResponse.json({
    def,
    market,
    dex: dexRes.data,
    chart: chartRes.data,
    scores,
    meta: {
      coingecko: cgMeta,
      dexscreener: dexRes.meta,
      chart: chartRes.meta,
    },
  });
}
