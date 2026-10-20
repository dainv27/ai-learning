import { test } from 'node:test';
import assert from 'node:assert/strict';

// Simulate the Java domain model behavior in Node.js for testing
class ApprovalStatus {
  static PENDING = 'PENDING';
  static APPROVED = 'APPROVED';
  static REJECTED = 'REJECTED';
}

class InvalidStateTransitionException extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidStateTransitionException';
  }
}

class Approval {
  constructor(id, requesterId, description, status, approverId, comment, createdAt, updatedAt) {
    this.id = id;
    this.requesterId = requesterId;
    this.description = description;
    this.status = status;
    this.approverId = approverId;
    this.comment = comment;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  reject(userId, rejectionComment) {
    if (this.status !== ApprovalStatus.PENDING) {
      throw new InvalidStateTransitionException(
        `Cannot reject approval in status ${this.status}. Only PENDING approvals can be rejected.`
      );
    }
    this.status = ApprovalStatus.REJECTED;
    this.approverId = userId;
    this.comment = rejectionComment;
    this.updatedAt = new Date();
  }
}

test('[TC-001] PENDING approval transitions to REJECTED when reject() is called', () => {
  const now = new Date();
  const approval = new Approval(
    'test-id',
    'requester123',
    'Test approval',
    ApprovalStatus.PENDING,
    null,
    null,
    now,
    now
  );

  approval.reject('rejector456', 'Not acceptable');

  assert.equal(approval.status, ApprovalStatus.REJECTED, 'Status should be REJECTED');
  assert.equal(approval.approverId, 'rejector456', 'approverId should be set to userId');
  assert.equal(approval.comment, 'Not acceptable', 'comment should be set');
  assert.ok(approval.updatedAt > now, 'updatedAt should be updated');
});

test('[TC-002] APPROVED approval throws InvalidStateTransitionException when reject() is called', () => {
  const now = new Date();
  const approval = new Approval(
    'test-id',
    'requester123',
    'Test approval',
    ApprovalStatus.APPROVED,
    'approver789',
    'Approved',
    now,
    now
  );

  assert.throws(
    () => approval.reject('rejector456', 'Cannot reject'),
    InvalidStateTransitionException,
    'Should throw InvalidStateTransitionException'
  );
});

test('[TC-003] REJECTED approval throws InvalidStateTransitionException when reject() is called again', () => {
  const now = new Date();
  const approval = new Approval(
    'test-id',
    'requester123',
    'Test approval',
    ApprovalStatus.REJECTED,
    'rejector999',
    'Already rejected',
    now,
    now
  );

  assert.throws(
    () => approval.reject('rejector456', 'Double reject'),
    InvalidStateTransitionException,
    'Should throw InvalidStateTransitionException for double-reject'
  );
});
