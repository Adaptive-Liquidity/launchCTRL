import { z } from 'zod';

export const WelcomeCopyStudioSchema = z.object({
  includeRulesLink: z.boolean().default(true),
  includeChartLink: z.boolean().default(false),
  includeContractAddress: z.boolean().default(false),
});
