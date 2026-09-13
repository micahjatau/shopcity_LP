import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertAccessibleReportBranch,
  extractBranchItems,
  requireReportBranchId,
} from './k6-fixtures.mjs';

describe('k6 report fixture validation', () => {
  it('rejects a missing report branch id before scenario execution', () => {
    assert.throws(
      () => requireReportBranchId(undefined),
      /K6_REPORT_BRANCH_ID is required/,
    );
  });

  it('accepts a configured branch from enveloped branch responses', () => {
    assert.equal(
      assertAccessibleReportBranch(
        { data: { items: [{ id: 'branch-1' }] } },
        'branch-1',
      ),
      'branch-1',
    );
  });

  it('rejects inaccessible branch ids returned outside the fixture set', () => {
    assert.throws(
      () =>
        assertAccessibleReportBranch(
          { data: { items: [{ id: 'branch-2' }] } },
          'branch-1',
        ),
      /does not identify an accessible branch: branch-1/,
    );
  });

  it('extracts supported legacy and enveloped branch payload shapes', () => {
    assert.deepEqual(extractBranchItems({ data: [{ id: 'branch-1' }] }), [
      { id: 'branch-1' },
    ]);
    assert.deepEqual(extractBranchItems([{ id: 'branch-2' }]), [
      { id: 'branch-2' },
    ]);
  });
});
