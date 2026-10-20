import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Verify frontend makes correct API calls matching backend contract
const approvalDetailPath = join(__dirname, '../../fe/fe/app/approvals/[id]/ApprovalDetail.tsx');
const pagePath = join(__dirname, '../../fe/fe/app/approvals/[id]/page.tsx');

let approvalDetailContent = '';
let pageContent = '';

try {
  approvalDetailContent = readFileSync(approvalDetailPath, 'utf-8');
  pageContent = readFileSync(pagePath, 'utf-8');
} catch (err) {
  // Files will be checked in individual tests
}

describe('Frontend-Backend API Contract Integration', () => {
  test('[TC-049] Frontend calls GET /api/approvals/{id} endpoint', () => {
    assert.ok(pageContent.includes('/api/approvals/'), 'Page should call approval API');
    assert.ok(pageContent.includes('${id}') || pageContent.includes('params.id'),
              'Page should use dynamic ID in API call');
  });

  test('[TC-050] Frontend calls POST /api/approvals/{id}/approve endpoint', () => {
    assert.ok(approvalDetailContent.includes('/approve'), 'Component should have approve endpoint');
    assert.ok(approvalDetailContent.includes('POST') || approvalDetailContent.includes('method'),
              'Component should use POST method for approve');
  });

  test('[TC-051] Frontend calls POST /api/approvals/{id}/reject endpoint', () => {
    assert.ok(approvalDetailContent.includes('/reject'), 'Component should have reject endpoint');
    assert.ok(approvalDetailContent.includes('method'), 'Component should specify HTTP method');
  });

  test('[TC-052] Frontend sends Content-Type application/json', () => {
    assert.ok(approvalDetailContent.includes('Content-Type') && approvalDetailContent.includes('application/json'),
              'Component should set correct Content-Type header');
  });

  test('[TC-053] Frontend sends request body with comment field', () => {
    assert.ok(approvalDetailContent.includes('comment'), 'Component should include comment in request');
    assert.ok(approvalDetailContent.includes('JSON.stringify'), 'Component should serialize request body');
  });

  test('[TC-054] Frontend handles all documented error status codes', () => {
    // Verify all error codes from backend are handled
    const errorCodes = ['400', '403', '404', '409'];
    for (const code of errorCodes) {
      assert.ok(approvalDetailContent.includes(code),
                `Component should handle ${code} error status`);
    }
  });

  test('[TC-055] Frontend uses environment variable for API base URL', () => {
    assert.ok(pageContent.includes('API_BASE_URL') || pageContent.includes('NEXT_PUBLIC_API_BASE_URL'),
              'Page should use environment variable for API base URL');
    assert.ok(approvalDetailContent.includes('API_BASE_URL') || approvalDetailContent.includes('NEXT_PUBLIC_API_BASE_URL'),
              'Component should use environment variable for API base URL');
  });
});

describe('Backend API Implementation Verification', () => {
  test('[TC-056] Controller defines POST /api/approvals/{id}/approve endpoint', () => {
    const controllerPath = join(__dirname, '../../be/src/main/java/com/phase0demo/approve/adapter/in/web/ApprovalController.java');
    let controllerContent = '';
    try {
      controllerContent = readFileSync(controllerPath, 'utf-8');
    } catch (err) {
      assert.fail('ApprovalController.java should exist');
    }
    assert.ok(controllerContent.includes('@PostMapping'), 'Controller should have POST mapping');
    assert.ok(controllerContent.includes('/approve'), 'Controller should define approve endpoint');
  });

  test('[TC-057] Controller defines POST /api/approvals/{id}/reject endpoint', () => {
    const controllerPath = join(__dirname, '../../be/src/main/java/com/phase0demo/approve/adapter/in/web/ApprovalController.java');
    let controllerContent = '';
    try {
      controllerContent = readFileSync(controllerPath, 'utf-8');
    } catch (err) {
      assert.fail('ApprovalController.java should exist');
    }
    assert.ok(controllerContent.includes('/reject'), 'Controller should define reject endpoint');
  });

  test('[TC-058] Controller requires Idempotency-Key header', () => {
    const controllerPath = join(__dirname, '../../be/src/main/java/com/phase0demo/approve/adapter/in/web/ApprovalController.java');
    let controllerContent = '';
    try {
      controllerContent = readFileSync(controllerPath, 'utf-8');
    } catch (err) {
      assert.fail('ApprovalController.java should exist');
    }
    assert.ok(controllerContent.includes('Idempotency-Key') || controllerContent.includes('idempotencyKey'),
              'Controller should accept Idempotency-Key header');
    assert.ok(controllerContent.includes('@RequestHeader'),
              'Controller should use @RequestHeader for idempotency key');
  });

  test('[TC-059] Controller returns appropriate error responses', () => {
    const controllerPath = join(__dirname, '../../be/src/main/java/com/phase0demo/approve/adapter/in/web/ApprovalController.java');
    let controllerContent = '';
    try {
      controllerContent = readFileSync(controllerPath, 'utf-8');
    } catch (err) {
      assert.fail('ApprovalController.java should exist');
    }
    assert.ok(controllerContent.includes('@ExceptionHandler'), 'Controller should have exception handlers');
    assert.ok(controllerContent.includes('NOT_FOUND'), 'Controller should handle not found errors');
    assert.ok(controllerContent.includes('FORBIDDEN'), 'Controller should handle forbidden errors');
    assert.ok(controllerContent.includes('CONFLICT') || controllerContent.includes('409'),
              'Controller should handle conflict errors');
  });
});
