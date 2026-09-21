import { handleSolanaRpc } from '../solanaProxy.js';

/** Vercel function backing the `/api/solana-rpc` route in production. */
export const POST = (request: Request) => handleSolanaRpc(request, process.env);
