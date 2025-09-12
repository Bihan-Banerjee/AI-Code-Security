// src/lib/schemas.ts
import { z } from "zod";

export const CweSchema = z.object({
  id: z.number(),
  link: z.string().url(),
});

export const BanditItem = z.object({
  filename: z.string(),
  issue_severity: z.string().optional(),
  issue_text: z.string().optional(),
  line_number: z.number().optional(),
  issue_cwe: CweSchema.optional(),
});
export const BanditResponse = z.object({
  results: z.array(BanditItem).optional(),
});