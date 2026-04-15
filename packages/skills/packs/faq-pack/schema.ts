import { z } from 'zod';

export const FaqPackSchema = z.object({
  includeTokenomics: z.boolean().default(true),
  includeTeamFaq: z.boolean().default(false),
  includeSecurityFaq: z.boolean().default(true),
});
