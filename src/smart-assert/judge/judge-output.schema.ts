import { z } from 'zod';

/**
 * W2: straight port of the Python `Verdict` model (one verdict for the whole text).
 * W5 replaces this with the per-criterion `JudgeOutput` schema.
 */
export const VerdictSchema = z.object({
  verdict: z.enum(['PASS', 'FAIL', 'INCONCLUSIVE']),
  confidence: z.enum(['low', 'medium', 'high']),
  reason: z.string(),
  evidence: z.string(),
});

export type Verdict = z.infer<typeof VerdictSchema>;
export type VerdictValue = Verdict['verdict'];
