import axios from 'axios';
import { z } from 'zod';

// Same-origin path proxied to https://status.near-intents.org/api/posts?is_featured=true
// (see vercel.json and vite.config.ts) since the status page doesn't allow CORS
const ONE_CLICK_STATUS_PATH = '/api/one-click-status';

const oneClickStatusSchema = z.object({
  posts: z.array(
    z.object({
      id: z.string(),
      post_type: z.union([z.literal('maintenance'), z.literal('incident')]),
      starts_at: z.number().nullable(),
      ends_at: z.number().nullable(),
    }),
  ),
});

const isServiceDisrupted = ({
  posts,
}: z.infer<typeof oneClickStatusSchema>) => {
  if (posts.some((post) => post.post_type === 'incident')) {
    return true;
  }

  const now = Date.now();

  // Only ongoing maintenance counts, upcoming one doesn't affect swaps yet
  return posts.some(
    ({ post_type, starts_at, ends_at }) =>
      post_type === 'maintenance' &&
      !!starts_at &&
      !!ends_at &&
      now >= starts_at &&
      now <= ends_at,
  );
};

export const getOneClickStatus = async () => {
  const { data } = await axios.get<unknown>(ONE_CLICK_STATUS_PATH);

  return { isDisrupted: isServiceDisrupted(oneClickStatusSchema.parse(data)) };
};
