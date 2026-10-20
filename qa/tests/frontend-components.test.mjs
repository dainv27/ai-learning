import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Frontend component tests validate that the delivered TSX files exist and contain
// the expected exports and structure. Full component testing requires a React test
// environment (Jest + React Testing Library or similar), which is not available in
// the Node.js test runner. These tests perform static validation only.

describe('Frontend Components Tests', () => {
  test('[TC-029] ApprovalActions component exists and exports correctly', () => {
    const path = join(process.cwd(), 'fe/fe/src/components/approvals/ApprovalActions.tsx');
    assert.ok(existsSync(path), 'ApprovalActions.tsx should exist');
    const content = readFileSync(path, 'utf-8');
    assert.ok(content.includes('export default function ApprovalActions'), 'ApprovalActions should export a default function component');
    assert.ok(content.includes('approveRequest') && content.includes('rejectRequest'), 'ApprovalActions should import and use approveRequest and rejectRequest');
    assert.ok(content.includes('generateIdempotencyKey'), 'ApprovalActions should import and use generateIdempotencyKey');
  });

  test('[TC-030] Approval detail page exists and exports correctly', () => {
    const path = join(process.cwd(), 'fe/fe/src/app/approvals/[id]/page.tsx');
    assert.ok(existsSync(path), 'Approval detail page should exist');
    const content = readFileSync(path, 'utf-8');
    assert.ok(content.includes('export default function ApprovalDetailPage'), 'Approval detail page should export a default function');
    assert.ok(content.includes('getApproval'), 'Approval detail page should import getApproval');
    assert.ok(content.includes('ApprovalActions'), 'Approval detail page should import ApprovalActions component');
    assert.ok(content.includes('notFound'), 'Approval detail page should handle not-found case');
  });

  test('[TC-031] Approval list page exists and exports correctly', () => {
    const path = join(process.cwd(), 'fe/fe/src/app/approvals/page.tsx');
    assert.ok(existsSync(path), 'Approval list page should exist');
    const content = readFileSync(path, 'utf-8');
    assert.ok(content.includes('export default function ApprovalsPage'), 'Approval list page should export a default function');
    assert.ok(content.includes('getApprovals'), 'Approval list page should import getApprovals');
    assert.ok(content.includes('LoadingState') || content.includes('Suspense'), 'Approval list page should handle loading state');
    assert.ok(content.includes('EmptyState'), 'Approval list page should handle empty state');
  });

  test('[TC-032] Not-found page exists for missing approvals', () => {
    const path = join(process.cwd(), 'fe/fe/src/app/approvals/[id]/not-found.tsx');
    assert.ok(existsSync(path), 'Not-found page should exist');
    const content = readFileSync(path, 'utf-8');
    assert.ok(content.includes('export default function NotFound'), 'Not-found page should export a default function');
    assert.ok(content.includes('Approval Not Found') || content.includes('not found'), 'Not-found page should display appropriate message');
  });
});
