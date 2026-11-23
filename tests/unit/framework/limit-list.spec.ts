import { expect, test } from '@playwright/test';
import { limitList } from '@framework/data/limit-list';

const jobTypes = (keys: number[]) => keys.map((key) => ({ key: String(key), value: `Job ${key}` }));

test.describe('limitList', () => {
  test('keeps a list of up to `limit` items as returned', () => {
    const body = jobTypes([1, 2, 14, 3]);

    expect(limitList(body, { limit: 4, sortBy: 'key' })).toEqual({
      body,
      totalCount: 4,
      storedCount: 4,
      order: 'as returned',
    });
  });

  test('cuts a longer list to `limit`, sorted descending, numbers by value', () => {
    const result = limitList(jobTypes([1, 2, 14, 3, 10]), { limit: 3, sortBy: 'key' });

    expect(result.body).toEqual(jobTypes([14, 10, 3]));
    expect(result).toMatchObject({ totalCount: 5, storedCount: 3, order: 'key desc' });
  });

  test('sorts text descending alphabetically, ignoring the server order', () => {
    const body = ['Length (m)', 'ABAX Serial Number', 'Weight (mt)', 'construction'].map(
      (description) => ({ languageCode: 1, description, value: null }),
    );

    const result = limitList(body, { limit: 3, sortBy: 'description' });

    expect((result.body as { description: string }[]).map((item) => item.description)).toEqual([
      'Weight (mt)',
      'Length (m)',
      'construction',
    ]);
  });

  test('keeps exactly 50 of 120 items: the 50 highest', () => {
    const result = limitList(jobTypes(Array.from({ length: 120 }, (_, index) => index + 1)), {
      limit: 50,
      sortBy: 'key',
    });
    const keys = (result.body as { key: string }[]).map((item) => Number(item.key));

    expect(keys).toHaveLength(50);
    expect(keys[0]).toBe(120);
    expect(keys.at(-1)).toBe(71);
  });

  test('equal values keep the server order; items without the key sort last', () => {
    const body = [
      { value: 'no key' },
      { key: '2', value: 'a' },
      { key: '2', value: 'b' },
      { key: '9' },
    ];

    const result = limitList(body, { limit: 3, sortBy: 'key' });

    expect(result.body).toEqual([{ key: '9' }, { key: '2', value: 'a' }, { key: '2', value: 'b' }]);
  });

  test('does not change the original list', () => {
    const body = jobTypes([1, 2, 3]);

    limitList(body, { limit: 2, sortBy: 'key' });

    expect(body).toEqual(jobTypes([1, 2, 3]));
  });

  test('keeps an error body unchanged', () => {
    const body = { memberNames: ['languageCode'], errorMessage: '2 invalid language' };

    expect(limitList(body, { limit: 50, sortBy: 'key' })).toEqual({
      body,
      totalCount: null,
      storedCount: null,
      order: 'as returned',
    });
  });
});
