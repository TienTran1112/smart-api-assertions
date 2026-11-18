import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { Judge, JudgeCallInfo, JudgeInput, JudgeVerdict } from './judge';
import { VerdictSchema } from './judge-output.schema';
import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserMessage } from './prompts/v1';

export type JudgeEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ClaudeJudgeOptions {
  /** Default `claude-opus-5-5`. */
  model?: string;
  /** Always sent explicitly; defaults differ per model. Default `medium`. */
  effort?: JudgeEffort;
  /** Thinking tokens count toward this. Default 4000. */
  maxTokens?: number;
  /** Inject a client (tests, custom timeouts). Created lazily otherwise. */
  client?: Anthropic;
  /** Called once per judge call with model, tokens and time. */
  onCall?: (info: JudgeCallInfo) => void;
}

/**
 * The real judge: one structured-output call to Claude per verdict.
 * No tools, no sampling parameters, no server-side fallbacks (the model must not change silently).
 */
export class ClaudeJudge implements Judge {
  private client: Anthropic | undefined;
  readonly model: string;
  readonly effort: JudgeEffort;
  private readonly maxTokens: number;
  private readonly onCall: ((info: JudgeCallInfo) => void) | undefined;

  constructor(options: ClaudeJudgeOptions = {}) {
    this.client = options.client;
    this.model = options.model ?? 'claude-opus-5-5';
    this.effort = options.effort ?? 'medium';
    this.maxTokens = options.maxTokens ?? 4000;
    this.onCall = options.onCall;
  }

  async judge({ actual, criteria, context = '' }: JudgeInput): Promise<JudgeVerdict> {
    this.client ??= new Anthropic();
    const started = Date.now();

    let response;
    try {
      response = await this.client.messages.parse({
        model: this.model,
        max_tokens: this.maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserMessage(actual, criteria, context) }],
        output_config: { effort: this.effort, format: zodOutputFormat(VerdictSchema) },
      });
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        return inconclusive(`Judge API error: ${error.message}`);
      }
      throw error;
    }

    const call: JudgeCallInfo = {
      requestedModel: this.model,
      model: response.model,
      effort: this.effort,
      promptVersion: PROMPT_VERSION,
      stopReason: response.stop_reason,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      durationMs: Date.now() - started,
    };
    this.onCall?.(call);

    if (response.stop_reason === 'refusal') {
      return inconclusive('Model declined to judge', call);
    }
    if (response.stop_reason === 'max_tokens') {
      return inconclusive(`Judge output cut by max_tokens (${this.maxTokens})`, call);
    }
    if (response.model !== this.model) {
      return inconclusive(`Answered by ${response.model}, expected ${this.model}`, call);
    }
    if (!response.parsed_output) {
      return inconclusive('Judge output did not match the verdict schema', call);
    }
    return { ...response.parsed_output, call };
  }
}

function inconclusive(reason: string, call?: JudgeCallInfo): JudgeVerdict {
  return { verdict: 'INCONCLUSIVE', confidence: 'low', reason, evidence: '', call };
}
