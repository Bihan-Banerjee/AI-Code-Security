// src/lib/schemas.ts
import { z } from "zod";

export const BanditItem = z.object({
  filename: z.string(),
  issue_severity: z.string().optional(),
  issue_text: z.string().optional(),
  line_number: z.number().optional(),
});
export const BanditResponse = z.object({
  results: z.array(BanditItem).optional(),
});
