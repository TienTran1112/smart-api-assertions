import { expect, test } from '@playwright/test';
import { assertSemantic, SemanticAssertionError } from '@smart-assert';
import type { Judge, JudgeInput, JudgeVerdict, VerdictValue } from '@smart-assert';

/** Returns the given verdicts in order and records every call. */
class FakeJudge implements Judge {
  readonly calls: JudgeInput[] = [];
  private readonly queue: VerdictValue[];

  constructor(...verdicts: VerdictValue[]) {
    this.queue = [...verdicts];
  }

  async judge(input: JudgeInput): Promise<JudgeVerdict> {
    this.calls.push(input);
    const verdict = this.queue.shift();
    if (!verdict) throw new Error('FakeJudge ran out of verdicts');
    return { verdict, confidence: 'high', reason: `fake ${verdict}`, evidence: 'quote' };
  }
}

const OPTIONS = { criteria: 'Says the username is required.', context: 'login' };

test.describe('assertSemantic', () => {
  test('passes on a majority of PASS', async () => {
    const judge = new FakeJudge('PASS', 'FAIL', 'PASS');

    const result = await assertSemantic('The Username field is required.', {
      ...OPTIONS,
      judge,
      votes: 3,
    });

    expect(result).toMatchObject({ passed: true, passes: 2, votes: 3 });
    expect(judge.calls).toHaveLength(3);
    expect(judge.calls[0]).toEqual({
      actual: 'The Username field is required.',
      criteria: OPTIONS.criteria,
      context: OPTIONS.context,
    });
  });

  test('fails on a minority of PASS and reports the first non-PASS reason', async () => {
    const judge = new FakeJudge('FAIL', 'PASS', 'FAIL');

    const run = assertSemantic('text', { ...OPTIONS, judge, votes: 3 });

    await expect(run).rejects.toThrow(SemanticAssertionError);
    await expect(run).rejects.toThrow(/1\/3 PASS.*fake FAIL/);
  });

  test('INCONCLUSIVE breaks a tie against PASS', async () => {
    const judge = new FakeJudge('PASS', 'INCONCLUSIVE');

    const run = assertSemantic('text', { ...OPTIONS, judge, votes: 2 });

    await expect(run).rejects.toThrow(/1\/2 PASS/);
  });
});
