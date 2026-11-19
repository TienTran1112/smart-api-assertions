import { ClaudeCodeJudge } from './claude-code-judge';
import { ClaudeJudge, type JudgeEffort } from './claude-judge';
import type { Judge } from './judge';

/**
 * `api`: the real judge (Claude API, API key, billed per token).
 * `claude-code`: dev-only, runs Claude Code headless on the Pro/Max subscription.
 */
export const JUDGE_BACKENDS = ['api', 'claude-code'] as const;
export type JudgeBackend = (typeof JUDGE_BACKENDS)[number];

export interface CreateJudgeOptions {
  backend?: JudgeBackend;
  model?: string;
  effort?: JudgeEffort;
}

export function createJudge({ backend = 'api', model, effort }: CreateJudgeOptions = {}): Judge {
  return backend === 'claude-code'
    ? new ClaudeCodeJudge({ model, effort })
    : new ClaudeJudge({ model, effort });
}
