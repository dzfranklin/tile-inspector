import { z } from 'zod';

export const tilejsonSpec = z.object({
  format: z.string().optional(),
  vector_layers: z.array(z.object({ id: z.string() })).optional(),
});

export type TileJSON = z.infer<typeof tilejsonSpec>;
