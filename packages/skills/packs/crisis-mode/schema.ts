import { z } from 'zod';

export const CrisisModeSchema = z.object({
  lockdownOnActivate: z.boolean().default(false),
});
