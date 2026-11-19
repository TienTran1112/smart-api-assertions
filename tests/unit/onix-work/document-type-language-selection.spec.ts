import { expect, test } from '@playwright/test';
import {
  DOCUMENT_TYPE_LANGUAGE_CASES,
  selectLanguageCases,
} from '../../onix-work/api/common/document-type/document-type.test-data';

const codes = (input: string | undefined) =>
  selectLanguageCases(input).map((language) => language.languageCode);

test.describe('selectLanguageCases', () => {
  test('should return every language for empty input or "all"', () => {
    for (const input of [undefined, '', '   ', 'all', 'ALL']) {
      expect(selectLanguageCases(input), JSON.stringify(input)).toEqual(
        DOCUMENT_TYPE_LANGUAGE_CASES,
      );
    }
  });

  test('should accept commas, spaces and ranges, without duplicates, in test-data order', () => {
    expect(codes('3,1')).toEqual([1, 3]);
    expect(codes(' 1  3 ')).toEqual([1, 3]);
    expect(codes('4-6')).toEqual([4, 5, 6]);
    expect(codes('0, 4-5, 5')).toEqual([0, 4, 5]);
  });

  test('should reject codes with no test data, listing the valid ones', () => {
    expect(() => selectLanguageCases('14')).toThrow(
      /No test data for languageCode 14\. Choose from: 1 English/,
    );
    expect(() => selectLanguageCases('1-3')).toThrow(/No test data for languageCode 2/);
  });

  test('should reject text that is not a code or a range', () => {
    expect(() => selectLanguageCases('en')).toThrow(/"en" is not a languageCode/);
    expect(() => selectLanguageCases('6-4')).toThrow(/range "6-4" goes backwards/);
  });
});
