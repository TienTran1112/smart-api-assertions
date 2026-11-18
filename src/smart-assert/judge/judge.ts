import type { Verdict } from './judge-output.schema';

export interface JudgeInput {
  /** Server-written text under test (data, never instructions). */
  actual: string;
  /** Expected behavior written by the tester (W2: one string; W5: a list of criteria). */
  criteria: string;
  /** Short description of where the text comes from. */
  context?: string;
}

/** What one judge call cost and which model answered. Absent for fake judges. */
export interface JudgeCallInfo {
  requestedModel: string;
  model: string | null;
  effort: string;
  promptVersion: string;
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export interface JudgeVerdict extends Verdict {
  call?: JudgeCallInfo;
}

/** Implemented by ClaudeJudge (real) and by fakes in unit tests. */
export interface Judge {
  judge(input: JudgeInput): Promise<JudgeVerdict>;
}
