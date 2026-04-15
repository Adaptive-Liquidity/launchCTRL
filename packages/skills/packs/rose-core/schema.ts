import { z } from 'zod';

export const RoseCoreConfigSchema = z.object({
  botUsername: z.string().default('MissRose_bot'),
  welcomeEnabled: z.boolean().default(true),
  captchaEnabled: z.boolean().default(false),
  antiFloodThreshold: z.number().min(1).max(50).default(5),
});

export type RoseCoreConfig = z.infer<typeof RoseCoreConfigSchema>;
