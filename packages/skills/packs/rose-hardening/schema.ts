import { z } from 'zod';

export const RoseHardeningConfigSchema = z.object({
  blockForwardedMessages: z.boolean().default(true),
  blockLinks: z.boolean().default(true),
  blockBotAccounts: z.boolean().default(true),
  muteOnJoin: z.boolean().default(false),
});

export type RoseHardeningConfig = z.infer<typeof RoseHardeningConfigSchema>;
