import { z } from 'zod';

export const decodeQueryResult = <T extends z.ZodTypeAny>(
  response: unknown,
  schema: T,
): z.infer<T> => {
  const parsed = z.object({ result: z.array(z.number()) }).parse(response);
  const uint8Array = new Uint8Array(parsed.result);
  const decoder = new TextDecoder();
  const result = decoder.decode(uint8Array);

  return schema.parse(JSON.parse(result)) as unknown;
};
