import { expect, test } from '@playwright/test';
import {
  compareLookupList,
  EMPTY_LOOKUP_LIST_DIFF,
} from '@framework/assertions/compare-lookup-list';

const KEYS = { idKey: 'documentTypeId', textKey: 'description' };
const EXPECTED = { 1: 'Certificate', 2: 'Checklist', 3: 'Instructions' };

const item = (documentTypeId: unknown, description: unknown) => ({ documentTypeId, description });

test.describe('compareLookupList', () => {
  test('should return an empty diff when ids and texts match, in any order', () => {
    const actual = [item(3, 'Instructions'), item(1, 'Certificate'), item(2, 'Checklist')];

    expect(compareLookupList(EXPECTED, actual, KEYS)).toEqual(EMPTY_LOOKUP_LIST_DIFF);
  });

  test('should report missing and extra ids', () => {
    const actual = [item(1, 'Certificate'), item(2, 'Checklist'), item(99, 'New type')];

    const diff = compareLookupList(EXPECTED, actual, KEYS);

    expect(diff.missingIds).toEqual([3]);
    expect(diff.extraIds).toEqual([99]);
    expect(diff.changed).toEqual([]);
  });

  test('should report a changed text exactly, without trimming or case folding', () => {
    const actual = [item(1, 'certificate'), item(2, 'Checklist '), item(3, 'Instructions')];

    expect(compareLookupList(EXPECTED, actual, KEYS).changed).toEqual([
      { id: 1, expected: 'Certificate', actual: 'certificate' },
      { id: 2, expected: 'Checklist', actual: 'Checklist ' },
    ]);
  });

  test('should report duplicate ids and compare the first occurrence', () => {
    const actual = [
      item(1, 'Certificate'),
      item(1, 'Other text'),
      item(2, 'Checklist'),
      item(3, 'Instructions'),
    ];

    const diff = compareLookupList(EXPECTED, actual, KEYS);

    expect(diff.duplicateIds).toEqual([1]);
    expect(diff.changed).toEqual([]);
  });

  test('should report items with the wrong shape', () => {
    const actual = [
      item('1', 'Certificate'),
      item(2, ''),
      { ...item(3, 'Instructions'), extra: true },
      null,
    ];

    const diff = compareLookupList(EXPECTED, actual, KEYS);

    expect(diff.shapeErrors).toEqual([
      '[0].documentTypeId is not an integer (got "1")',
      '[1].description is empty',
      '[2] has unexpected properties: extra',
      '[3] is not an object (got null)',
    ]);
    expect(diff.missingIds).toEqual([1]);
    expect(diff.changed).toEqual([{ id: 2, expected: 'Checklist', actual: '' }]);
  });

  test('should report a body that is not an array, with every expected id missing', () => {
    const diff = compareLookupList(EXPECTED, { memberNames: ['languageCode'] }, KEYS);

    expect(diff.shapeErrors).toEqual(['body is not an array (got object)']);
    expect(diff.missingIds).toEqual([1, 2, 3]);
  });
});
