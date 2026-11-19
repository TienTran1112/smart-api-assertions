import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import type { JudgeEffort } from './claude-judge';
import type { Judge, JudgeCallInfo, JudgeInput, JudgeVerdict } from './judge';
import { VerdictSchema } from './judge-output.schema';
import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserMessage } from './prompts/v1';

export interface ClaudeCodeRunResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/** Runs the CLI once. Replaced by a fake in unit tests. */
export type ClaudeCodeRunner = (
  command: string,
  args: string[],
  input: string,
  timeoutMs: number,
) => Promise<ClaudeCodeRunResult>;

export interface ClaudeCodeJudgeOptions {
  /** Default `claude-opus-5-5`. */
  model?: string;
  /** Default `medium`, the same as `ClaudeJudge`. */
  effort?: JudgeEffort;
  /** The Claude Code executable. Default `claude` (must be on PATH). */
  command?: string;
  /** Kept below the 60 s Playwright test timeout. Default 45 000. */
  timeoutMs?: number;
  run?: ClaudeCodeRunner;
  onCall?: (info: JudgeCallInfo) => void;
}

/**
 * Dev-only judge: runs Claude Code headless (`claude -p`), so calls use the Pro/Max
 * subscription that Claude Code is signed in with instead of an API key.
 *
 * Not for measured runs: Claude Code adds its own context (about 1.5K input tokens, including
 * a structured-output tool), `max_tokens` cannot be set, and subscription rate limits apply.
 * Same prompt, schema and INCONCLUSIVE rules as `ClaudeJudge` otherwise.
 */
export class ClaudeCodeJudge implements Judge {
  readonly model: string;
  readonly effort: JudgeEffort;
  private readonly command: string;
  private readonly timeoutMs: number;
  private readonly run: ClaudeCodeRunner;
  private readonly onCall: ((info: JudgeCallInfo) => void) | undefined;

  constructor(options: ClaudeCodeJudgeOptions = {}) {
    this.model = options.model ?? 'claude-opus-5-5';
    this.effort = options.effort ?? 'medium';
    this.command = options.command ?? 'claude';
    this.timeoutMs = options.timeoutMs ?? 45_000;
    this.run = options.run ?? runClaudeCode;
    this.onCall = options.onCall;
  }

  /** CLI arguments; the user message goes on stdin. */
  buildArgs(): string[] {
    return [
      '--print',
      '--model',
      this.model,
      '--effort',
      this.effort,
      // Replaces Claude Code's default system prompt.
      '--system-prompt',
      SYSTEM_PROMPT,
      // No built-in tools, no MCP servers, no user/project settings (hooks, plugins).
      '--tools',
      '',
      '--strict-mcp-config',
      '--setting-sources',
      '',
      '--no-session-persistence',
      '--output-format',
      'json',
      '--json-schema',
      VERDICT_JSON_SCHEMA,
    ];
  }

  async judge({ actual, criteria, context = '' }: JudgeInput): Promise<JudgeVerdict> {
    const started = Date.now();
    const result = await this.run(
      this.command,
      this.buildArgs(),
      buildUserMessage(actual, criteria, context),
      this.timeoutMs,
    );

    if (result.timedOut) {
      return inconclusive(`Claude Code did not answer within ${this.timeoutMs} ms`);
    }

    const output = parseCliOutput(result.stdout);
    if (!output) {
      const detail = (result.stderr || result.stdout).trim().slice(0, 300);
      return inconclusive(`Claude Code exited ${result.exitCode}: ${detail}`);
    }

    const answeredBy = Object.keys(output.modelUsage ?? {});
    const usage = output.usage;
    const call: JudgeCallInfo = {
      requestedModel: this.model,
      model: answeredBy.includes(this.model) ? this.model : (answeredBy[0] ?? null),
      effort: this.effort,
      promptVersion: PROMPT_VERSION,
      stopReason: output.stop_reason ?? null,
      // Claude Code caches its prompt, so most input arrives as cache tokens.
      inputTokens:
        (usage?.input_tokens ?? 0) +
        (usage?.cache_creation_input_tokens ?? 0) +
        (usage?.cache_read_input_tokens ?? 0),
      outputTokens: usage?.output_tokens ?? 0,
      durationMs: Date.now() - started,
    };
    this.onCall?.(call);

    if (output.is_error) {
      return inconclusive(`Claude Code error (${output.subtype}): ${output.result ?? ''}`, call);
    }
    if (output.stop_reason === 'refusal') {
      return inconclusive('Model declined to judge', call);
    }
    if (answeredBy.length !== 1 || call.model !== this.model) {
      return inconclusive(
        `Answered by ${answeredBy.join(', ') || 'unknown'}, expected ${this.model}`,
        call,
      );
    }
    const parsed = VerdictSchema.safeParse(output.structured_output);
    if (!parsed.success) {
      return inconclusive('Judge output did not match the verdict schema', call);
    }
    return { ...parsed.data, call };
  }
}

/**
 * The verdict schema for `--json-schema`, without the `$schema` key: Zod sets it to draft
 * 2020-12, and Claude Code's validator rejects that ("no schema with key or ref").
 */
const VERDICT_JSON_SCHEMA = JSON.stringify(
  Object.fromEntries(
    Object.entries(z.toJSONSchema(VerdictSchema)).filter(([key]) => key !== '$schema'),
  ),
);

/** The parts of `claude --print --output-format json` that the judge reads. */
const CliOutputSchema = z.object({
  subtype: z.string(),
  is_error: z.boolean(),
  result: z.string().optional(),
  stop_reason: z.string().nullable().optional(),
  structured_output: z.unknown().optional(),
  usage: z
    .object({
      input_tokens: z.number(),
      output_tokens: z.number(),
      cache_creation_input_tokens: z.number().optional(),
      cache_read_input_tokens: z.number().optional(),
    })
    .optional(),
  modelUsage: z.record(z.string(), z.unknown()).optional(),
});

function parseCliOutput(stdout: string): z.infer<typeof CliOutputSchema> | undefined {
  try {
    const parsed = CliOutputSchema.safeParse(JSON.parse(stdout));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The child environment without API credentials. Claude Code prefers `ANTHROPIC_API_KEY`
 * over its claude.ai login, and `.env` loads that key into this process.
 */
export function subscriptionEnvironment(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const child = { ...env };
  delete child.ANTHROPIC_API_KEY;
  delete child.ANTHROPIC_AUTH_TOKEN;
  return child;
}

/** Default runner. Runs in the temp folder so no project CLAUDE.md or settings are picked up. */
export const runClaudeCode: ClaudeCodeRunner = (command, args, input, timeoutMs) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: tmpdir(),
      env: subscriptionEnvironment(),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.setEncoding('utf8').on('data', (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk));
    child.on('error', (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(
        error.code === 'ENOENT'
          ? new Error(`Claude Code CLI "${command}" not found. Install Claude Code and sign in.`)
          : error,
      );
    });
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, stdout, stderr, timedOut });
    });
    child.stdin.end(input);
  });

function inconclusive(reason: string, call?: JudgeCallInfo): JudgeVerdict {
  return { verdict: 'INCONCLUSIVE', confidence: 'low', reason, evidence: '', call };
}
