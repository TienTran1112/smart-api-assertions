import { expect, test } from '@playwright/test';
import { ONIX_LANGUAGES } from '@onix-work/language/language-code';
import { selectLanguages } from '@onix-work/language/language-selection';

const codes = (input: string | undefined) =>
  selectLanguages(input).map((language) => language.languageCode);

test.describe('selectLanguages', () => {
  test('should return every language for empty input or "all"', () => {
    for (const input of [undefined, '', '   ', 'all', 'ALL']) {
      expect(selectLanguages(input), JSON.stringify(input)).toEqual(ONIX_LANGUAGES);
    }
  });

  test('should accept commas, spaces and ranges, without duplicates, in list order', () => {
    expect(codes('3,1')).toEqual([1, 3]);
    expect(codes(' 1  3 ')).toEqual([1, 3]);
    expect(codes('4-6')).toEqual([4, 5, 6]);
    expect(codes('0, 4-5, 5')).toEqual([0, 4, 5]);
  });

  test('should reject unsupported codes, listing the valid ones', () => {
    expect(() => selectLanguages('14')).toThrow(
      /No supported language for languageCode 14\. Choose from: 1 English/,
    );
    expect(() => selectLanguages('1-3')).toThrow(/No supported language for languageCode 2/);
  });

  test('should reject text that is not a code or a range', () => {
    expect(() => selectLanguages('en')).toThrow(/"en" is not a languageCode/);
    expect(() => selectLanguages('6-4')).toThrow(/range "6-4" goes backwards/);
  });
});
