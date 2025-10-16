/**
 * Aurora token type from the Explorer API
 */
export interface AuroraToken {
  address: string;
  address_hash: string;
  circulating_market_cap: string | null;
  decimals: string;
  exchange_rate: string | null;
  holders: string;
  holders_count: number;
  icon_url: string | null;
  name: string;
  symbol: string;
  total_supply: string;
  type: string;
  volume_24h: string | null;
}

/**
 * Aurora Explorer API response format
 */
export interface AuroraTokensResponse {
  items: AuroraToken[];
  next_page_params: {
    address_hash: string;
    holders_count: number;
    is_name_null: boolean;
    items_count: number;
    market_cap: string;
    name: string;
  } | null;
}
