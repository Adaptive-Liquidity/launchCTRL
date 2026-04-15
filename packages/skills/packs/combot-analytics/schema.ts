import { z } from 'zod';

export const CombotAnalyticsConfigSchema = z.object({
  enableCasBan: z.boolean().default(true),
  antiSpamLevel: z.number().min(1).max(10).default(5),
  trackStats: z.boolean().default(true),
});

export type CombotAnalyticsConfig = z.infer<typeof CombotAnalyticsConfigSchema>;
