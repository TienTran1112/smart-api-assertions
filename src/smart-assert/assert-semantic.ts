import type { Judge, JudgeVerdict } from './judge/judge';

export interface AssertSemanticOptions {
  /** Expected behavior (W2: one string, as in the Python prototype). */
  criteria: string;
  context?: string;
  judge: Judge;
  /** Number of judge calls. PASS needs a strict majority. Default 1. */
  votes?: number;
}

export interface SemanticResult {
  passed: boolean;
  passes: number;
  votes: number;
  verdicts: JudgeVerdict[];
}

export class SemanticAssertionError extends Error {
  constructor(
    message: string,
    readonly result: SemanticResult,
  ) {
    super(message);
    this.name = 'SemanticAssertionError';
  }
}

/**
 * Asks the judge `votes` times and passes only on a strict majority of PASS.
 * INCONCLUSIVE counts against passing. Throws SemanticAssertionError on failure, which fails a
 * Playwright test; returns the result otherwise.
 */
export async function assertSemantic(
  actual: string,
  { criteria, context = '', judge, votes = 1 }: AssertSemanticOptions,
): Promise<SemanticResult> {
  if (!Number.isInteger(votes) || votes < 1) {
    throw new RangeError(`votes must be a positive integer, got ${votes}`);
  }

  const verdicts: JudgeVerdict[] = [];
  for (let i = 0; i < votes; i++) {
    verdicts.push(await judge.judge({ actual, criteria, context }));
  }

  const passes = verdicts.filter((v) => v.verdict === 'PASS').length;
  const result: SemanticResult = { passed: passes * 2 > votes, passes, votes, verdicts };

  if (!result.passed) {
    const worst = verdicts.find((v) => v.verdict !== 'PASS')!;
    throw new SemanticAssertionError(
      `Semantic assertion failed (${passes}/${votes} PASS): ${worst.reason} | ` +
        `evidence: ${JSON.stringify(worst.evidence)}`,
      result,
    );
  }
  return result;
}
