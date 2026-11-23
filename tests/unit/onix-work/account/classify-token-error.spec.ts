import { expect, test } from '@playwright/test';
import type { ApiResult } from '@framework/api/api-result';
import { classifyTokenError } from '@onix-work/api/public/errors/classify-token-error';

/** Bodies as the test host returned them on 2026-11-22 (traceId shortened). */
const TYPE = 'https://tools.ietf.org/html/rfc9110#section-15.5.1';
const TRACE_ID = '00-abc-def-00';

const result = (status: number, body: unknown = undefined): ApiResult<unknown> => ({
  status,
  headers: {},
  body,
});
const validation = (errors: Record<string, string[]>) =>
  result(400, {
    type: TYPE,
    title: 'One or more validation errors occurred.',
    status: 400,
    errors,
    traceId: TRACE_ID,
  });

test.describe('classifyTokenError', () => {
  test('200 is ok', () => {
    expect(classifyTokenError(result(200, 'eyJ...')).kind).toBe('ok');
  });

  test('400 without errors is credentials-rejected and keeps the traceId', () => {
    const classification = classifyTokenError(
      result(400, { type: TYPE, title: 'Bad Request', status: 400, traceId: TRACE_ID }),
    );

    expect(classification).toMatchObject({
      status: 400,
      kind: 'credentials-rejected',
      traceId: TRACE_ID,
    });
    expect(classification.description).toContain('does not say which');
  });

  test('empty fields: both fields required', () => {
    const classification = classifyTokenError(
      validation({
        Password: ['The Password field is required.'],
        Username: ['The Username field is required.'],
      }),
    );

    expect(classification.kind).toBe('field-required');
    expect(classification.problems.map((p) => [p.kind, p.field])).toEqual([
      ['field-required', 'password'],
      ['field-required', 'username'],
    ]);
    expect(classification.description).toBe(
      'Request rejected: password is required; username is required.',
    );
  });

  test('username over 100 characters is field-too-long', () => {
    const classification = classifyTokenError(
      validation({
        Username: ['The field Username must be a string with a maximum length of 100.'],
      }),
    );

    expect(classification.kind).toBe('field-too-long');
    expect(classification.problems).toEqual([
      {
        kind: 'field-too-long',
        field: 'username',
        message: 'The field Username must be a string with a maximum length of 100.',
      },
    ]);
  });

  test('empty body is body-missing; the "data" entry is not reported separately', () => {
    const classification = classifyTokenError(
      validation({
        '': ['A non-empty request body is required.'],
        data: ['The data field is required.'],
      }),
    );

    expect(classification.kind).toBe('body-missing');
    expect(classification.problems).toHaveLength(1);
  });

  test('only "data" required is body-missing', () => {
    expect(classifyTokenError(validation({ data: ['The data field is required.'] })).kind).toBe(
      'body-missing',
    );
  });

  test('truncated JSON is malformed-json, at the path where parsing stopped', () => {
    const classification = classifyTokenError(
      validation({
        data: ['The data field is required.'],
        '$.username': [
          'Expected depth to be zero at the end of the JSON payload. There is an open JSON object or array that should be closed. Path: $.username | LineNumber: 0 | BytePositionInLine: 12.',
        ],
      }),
    );

    expect(classification.kind).toBe('malformed-json');
    expect(classification.problems[0].field).toBe('username');
    expect(classification.description).not.toContain('LineNumber');
  });

  test('invalid JSON at the root is malformed-json without a field', () => {
    const classification = classifyTokenError(
      validation({
        $: ["'x' is an invalid start of a value. Path: $ | LineNumber: 0 | BytePositionInLine: 0."],
        data: ['The data field is required.'],
      }),
    );

    expect(classification.kind).toBe('malformed-json');
    expect(classification.problems[0].field).toBeUndefined();
  });

  test('a number for username is wrong-field-type on username', () => {
    const classification = classifyTokenError(
      validation({
        data: ['The data field is required.'],
        '$.username': [
          'The JSON value could not be converted to System.String. Path: $.username | LineNumber: 0 | BytePositionInLine: 15.',
        ],
      }),
    );

    expect(classification.kind).toBe('wrong-field-type');
    expect(classification.problems).toHaveLength(1);
    expect(classification.problems[0].field).toBe('username');
  });

  test('an array body is wrong-field-type on the whole body', () => {
    const classification = classifyTokenError(
      validation({
        $: [
          'The JSON value could not be converted to OnixWork.WebApi.OpenApi.Dtos.AccountItemDto. Path: $ | LineNumber: 0 | BytePositionInLine: 1.',
        ],
        data: ['The data field is required.'],
      }),
    );

    expect(classification.kind).toBe('wrong-field-type');
    expect(classification.problems[0].field).toBeUndefined();
  });

  test('the earliest problem wins: body-missing before field-required', () => {
    const classification = classifyTokenError(
      validation({
        Username: ['The Username field is required.'],
        '': ['A non-empty request body is required.'],
      }),
    );

    expect(classification.kind).toBe('body-missing');
    expect(classification.problems).toHaveLength(2);
  });

  test('an unknown message is field-invalid with the server text', () => {
    const classification = classifyTokenError(
      validation({ Username: ['The Username field is not a valid e-mail address.'] }),
    );

    expect(classification.kind).toBe('field-invalid');
    expect(classification.description).toContain('not a valid e-mail address');
  });

  for (const [status, kind] of [
    [401, 'unauthorized'],
    [405, 'method-not-allowed'],
    [415, 'unsupported-media-type'],
    [500, 'server-error'],
    [503, 'server-error'],
    [404, 'unexpected'],
  ] as const) {
    test(`HTTP ${status} is ${kind}`, () => {
      expect(classifyTokenError(result(status)).kind).toBe(kind);
    });
  }

  test('400 with a non-JSON body is unexpected', () => {
    expect(classifyTokenError(result(400, '<html>Bad Request</html>')).kind).toBe('unexpected');
  });

  for (const [message, cause] of [
    ['getaddrinfo ENOTFOUND openapi-test.onixwork.com', 'dns'],
    ['connect ECONNREFUSED 127.0.0.1:443', 'refused'],
    ['apiRequestContext.fetch: Timeout 30000ms exceeded.', 'timeout'],
    ['unable to verify the first certificate', 'tls'],
    ['socket hang up', 'reset'],
    ['something else', 'other'],
  ] as const) {
    test(`network error "${message}" is unreachable (${cause})`, () => {
      const classification = classifyTokenError(new Error(message));

      expect(classification).toMatchObject({ kind: 'unreachable', cause });
      expect(classification.status).toBeUndefined();
    });
  }
});
