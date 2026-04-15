import { z } from 'zod';

export const RaidModeSchema = z.object({
  raidSlowMode: z.number().min(0).max(900).default(60),
  banOnRaid: z.boolean().default(false),
});
