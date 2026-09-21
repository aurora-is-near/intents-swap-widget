import { handleJupiterBuild } from '../../../../solanaProxy.js';

/** Vercel function backing the `/api/jupiter/swap/v2/build` route in production. */
export const GET = (request: Request) =>
  handleJupiterBuild(request, process.env);
