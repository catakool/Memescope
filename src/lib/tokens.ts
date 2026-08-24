import { TokenDefinition } from "./types";

/**
 * Watchlist inicial. Os IDs correspondem ao endpoint /api/v3/search da CoinGecko
 * (confirmados manualmente em 2026-08-24, não são o símbolo do token).
 *
 * CYBERLEEK aparece aqui apenas como entrada de catálogo com `verified: false` e
 * `contractAddress: null`. A aplicação NUNCA ativa dados ao vivo para um token
 * "extreme" sem que o utilizador confirme o endereço do contrato através do
 * ecrã "Adicionar / Verificar token" (ver AddTokenModal + /api/verify-token).
 * Isto evita seguir clones ou impostores com o mesmo nome/símbolo.
 */
export const TOKEN_REGISTRY: TokenDefinition[] = [
  {
    coingeckoId: "dogecoin",
    symbol: "DOGE",
    name: "Dogecoin",
    chain: "unknown", // chain nativa própria, não é um token num contrato
    contractAddress: null,
    riskTier: "established",
    verified: true,
  },
  {
    coingeckoId: "shiba-inu",
    symbol: "SHIB",
    name: "Shiba Inu",
    chain: "ethereum",
    contractAddress: "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce",
    riskTier: "established",
    verified: true,
  },
  {
    coingeckoId: "pepe",
    symbol: "PEPE",
    name: "Pepe",
    chain: "ethereum",
    contractAddress: "0x6982508145454ce325ddbe47a25d4ec3d2311933",
    riskTier: "established",
    verified: true,
  },
  {
    coingeckoId: "pump-fun",
    symbol: "PUMP",
    name: "Pump.fun",
    chain: "solana",
    contractAddress: null,
    riskTier: "momentum",
    verified: true,
  },
  {
    coingeckoId: "pudgy-penguins",
    symbol: "PENGU",
    name: "Pudgy Penguins",
    chain: "solana",
    contractAddress: null,
    riskTier: "momentum",
    verified: true,
  },
  {
    coingeckoId: "dogwifcoin",
    symbol: "WIF",
    name: "dogwifhat",
    chain: "solana",
    contractAddress: null,
    riskTier: "high-risk",
    verified: true,
  },
  {
    coingeckoId: "bonk",
    symbol: "BONK",
    name: "Bonk",
    chain: "solana",
    contractAddress: null,
    riskTier: "high-risk",
    verified: true,
  },
  {
    coingeckoId: "fartcoin",
    symbol: "FARTCOIN",
    name: "Fartcoin",
    chain: "solana",
    contractAddress: null,
    riskTier: "high-risk",
    verified: true,
  },
  {
    coingeckoId: "cyberleek",
    symbol: "CYBERLEEK",
    name: "CyberLeek",
    chain: "unknown",
    contractAddress: null,
    riskTier: "extreme",
    verified: false,
    note:
      "Aguarda verificação manual do endereço do contrato antes de ativar dados ao vivo. " +
      "Vários tokens de meme usam nomes/símbolos duplicados — confirme sempre o contrato na origem oficial do projeto antes de confiar nesta entrada.",
  },
];

export function getTokenDef(coingeckoId: string): TokenDefinition | undefined {
  return TOKEN_REGISTRY.find((t) => t.coingeckoId === coingeckoId);
}
