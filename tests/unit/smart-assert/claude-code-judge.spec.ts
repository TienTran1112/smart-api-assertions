import { expect, test } from '@playwright/test';
import { ClaudeCodeJudge, subscriptionEnvironment } from '@smart-assert';
import type { ClaudeCodeRunner, ClaudeCodeRunResult } from '@smart-assert';

const MODEL = 'claude-haiku-5-5';
const VERDICT = { verdict: 'PASS', confidence: 'high', reason: 'ok', evidence: 'Bad Request' };
const INPUT = { actual: 'Bad Request', criteria: 'MUST NOT reveal the user.', context: 'login' };

/** Shape of `claude --print --output-format json`, trimmed to what the judge reads. */
function cliOutput(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    type: 'result',
    subtype: 'success',
    is_error: false,
    stop_reason: 'tool_use',
    structured_output: VERDICT,
    usage: {
      input_tokens: 2,
      cache_creation_input_tokens: 1500,
      cache_read_input_tokens: 0,
      output_tokens: 200,
    },
    modelUsage: { [MODEL]: {} },
    ...overrides,
  });
}

/** Returns a fixed result and records the call. */
function fakeRunner(result: Partial<ClaudeCodeRunResult>) {
  const calls: { command: string; args: string[]; input: string }[] = [];
  const run: ClaudeCodeRunner = async (command, args, input) => {
    calls.push({ command, args, input });
    return { exitCode: 0, stdout: '', stderr: '', timedOut: false, ...result };
  };
  return { calls, run };
}

test.describe('ClaudeCodeJudge', () => {
  test('returns the structured verdict and call info', async () => {
    const { calls, run } = fakeRunner({ stdout: cliOutput() });
    const judge = new ClaudeCodeJudge({ model: MODEL, effort: 'low', run });

    const verdict = await judge.judge(INPUT);

    expect(verdict).toMatchObject(VERDICT);
    expect(verdict.call).toMatchObject({
      requestedModel: MODEL,
      model: MODEL,
      effort: 'low',
      promptVersion: 'v1',
      inputTokens: 1502,
      outputTokens: 200,
    });
    expect(calls[0].command).toBe('claude');
    expect(calls[0].input).toContain('<response_under_test>Bad Request</response_under_test>');
  });

  test('pins the model and turns off tools, MCP servers and settings', () => {
    const args = new ClaudeCodeJudge({ model: MODEL, effort: 'high' }).buildArgs();
    const valueOf = (flag: string) => args[args.indexOf(flag) + 1];

    expect(args).toContain('--print');
    expect(args).toContain('--strict-mcp-config');
    expect(valueOf('--model')).toBe(MODEL);
    expect(valueOf('--effort')).toBe('high');
    expect(valueOf('--tools')).toBe('');
    expect(valueOf('--setting-sources')).toBe('');
    expect(valueOf('--output-format')).toBe('json');
    expect(valueOf('--system-prompt')).toContain('strict QA test oracle');
    const schema = JSON.parse(valueOf('--json-schema'));
    expect(schema.required).toEqual(
      expect.arrayContaining(['verdict', 'confidence', 'reason', 'evidence']),
    );
    // Claude Code rejects Zod's draft 2020-12 `$schema` reference.
    expect(schema).not.toHaveProperty('$schema');
  });

  const inconclusiveCases: {
    name: string;
    result: Partial<ClaudeCodeRunResult>;
    reason: RegExp;
  }[] = [
    { name: 'a timeout', result: { timedOut: true }, reason: /did not answer/ },
    {
      name: 'output that is not JSON',
      result: { exitCode: 1, stderr: 'Not logged in' },
      reason: /exited 1: Not logged in/,
    },
    {
      name: 'a CLI error',
      result: { stdout: cliOutput({ is_error: true, subtype: 'error', result: 'rate limited' }) },
      reason: /rate limited/,
    },
    {
      name: 'a refusal',
      result: { stdout: cliOutput({ stop_reason: 'refusal' }) },
      reason: /declined/,
    },
    {
      name: 'another model',
      result: { stdout: cliOutput({ modelUsage: { 'claude-sonnet-5-5': {} } }) },
      reason: /Answered by claude-sonnet-5-5, expected claude-haiku-5-5/,
    },
    {
      name: 'output that does not match the schema',
      result: { stdout: cliOutput({ structured_output: { verdict: 'MAYBE' } }) },
      reason: /did not match/,
    },
  ];

  for (const { name, result, reason } of inconclusiveCases) {
    test(`is INCONCLUSIVE on ${name}`, async () => {
      const judge = new ClaudeCodeJudge({ model: MODEL, run: fakeRunner(result).run });

      const verdict = await judge.judge(INPUT);

      expect(verdict.verdict).toBe('INCONCLUSIVE');
      expect(verdict.reason).toMatch(reason);
    });
  }

  test('removes API credentials from the child environment', () => {
    const env = subscriptionEnvironment({
      ANTHROPIC_API_KEY: 'sk-test',
      ANTHROPIC_AUTH_TOKEN: 'token',
      PATH: '/bin',
    });

    expect(env).toEqual({ PATH: '/bin' });
  });
});
