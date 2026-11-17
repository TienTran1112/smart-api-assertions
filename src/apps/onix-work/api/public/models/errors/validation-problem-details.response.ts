import type { ProblemDetailsResponse } from './problem-details.response';

/**
 * Problem details with validation messages, e.g. empty login fields:
 * `errors: { Username: ["The Username field is required."], Password: [...] }`.
 * The keys are not always field names (`""`, `data`, `$.username` also occur).
 */
export interface ValidationProblemDetailsResponse extends ProblemDetailsResponse {
  errors: Record<string, string[]>;
}
