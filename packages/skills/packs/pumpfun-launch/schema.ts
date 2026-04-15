import { z } from 'zod';

export const PumpFunLaunchConfigSchema = z.object({
  tokenAddress: z.string().optional(),
  ticker: z.string().min(1).max(10),
  dexscreenerUrl: z.string().url().optional(),
  graduationTarget: z.number().default(85),
});

export type PumpFunLaunchConfig = z.infer<typeof PumpFunLaunchConfigSchema>;
