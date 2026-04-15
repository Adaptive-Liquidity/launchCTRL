import { z } from 'zod';

export const CommandPackSocialsSchema = z.object({
  twitterUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  dexscreenerUrl: z.string().url().optional(),
  telegramUrl: z.string().url().optional(),
  docsUrl: z.string().url().optional(),
  contractAddress: z.string().optional(),
  ticker: z.string().optional(),
});

export type CommandPackSocialsConfig = z.infer<typeof CommandPackSocialsSchema>;
