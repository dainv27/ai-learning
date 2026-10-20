import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mock implementations for testing the use case logic
class ApprovalNotFoundException extends Error {
  constructor(id) {
    super(`Approval not found: ${id}`);
    this.name = 'ApprovalNotFoundException';
  }
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
    if (this.status !== 'PENDING') {
      throw new InvalidStateTransitionException(
        `Cannot reject approval in status ${this.status}. Only PENDING approvals can be rejected.`
      );
    }
    this.status = 'REJECTED';
    this.approverId = userId;
    this.comment = rejectionComment;
    this.updatedAt = new Date();
  }
}

class RejectApprovalUseCase {
  constructor(approvalRepository, idempotencyService) {
    this.approvalRepository = approvalRepository;
    this.idempotencyService = idempotencyService;
  }

  async execute(approvalId, userId, comment, idempotencyKey) {
    const cached = await this.approvalRepository.findByIdempotencyKey(idempotencyKey);
    if (cached) {
      return cached;
    }

    const approval = await this.approvalRepository.findById(approvalId);
    if (!approval) {
      throw new ApprovalNotFoundException(approvalId);
    }

    approval.reject(userId, comment);
    const saved = await this.approvalRepository.save(approval);
    await this.idempotencyService.recordKey(idempotencyKey, saved.id);
    return saved;
  }
}

test('[TC-004] Use case returns cached result when idempotency key was already used', async () => {
  const cachedApproval = new Approval(
    'cached-id',
    'requester',
    'Cached approval',
    'REJECTED',
    'rejector123',
    'Already rejected',
    new Date(),
    new Date()
  );

  const mockRepository = {
    findByIdempotencyKey: async (key) => cachedApproval,
    findById: async () => { throw new Error('Should not be called'); },
    save: async () => { throw new Error('Should not be called'); }
  };

  const mockIdempotencyService = {
    recordKey: async () => { throw new Error('Should not be called'); }
  };

  const useCase = new RejectApprovalUseCase(mockRepository, mockIdempotencyService);
  const result = await useCase.execute('any-id', 'user', 'comment', 'used-key');

  assert.equal(result, cachedApproval, 'Should return cached approval');
});

test('[TC-005] Use case throws ApprovalNotFoundException when approval does not exist', async () => {
  const mockRepository = {
    findByIdempotencyKey: async () => null,
    findById: async () => null
  };

  const mockIdempotencyService = {};

  const useCase = new RejectApprovalUseCase(mockRepository, mockIdempotencyService);

  await assert.rejects(
    async () => useCase.execute('missing-id', 'user', 'comment', 'key-123'),
    ApprovalNotFoundException,
    'Should throw ApprovalNotFoundException'
  );
});

test('[TC-006] Use case records idempotency key after successful reject', async () => {
  const pendingApproval = new Approval(
    'pending-id',
    'requester',
    'Pending approval',
    'PENDING',
    null,
    null,
    new Date(),
    new Date()
  );

  let recordKeyCalled = false;
  let recordedKey = null;
  let recordedId = null;

  const mockRepository = {
    findByIdempotencyKey: async () => null,
    findById: async () => pendingApproval,
    save: async (approval) => approval
  };

  const mockIdempotencyService = {
    recordKey: async (key, id) => {
      recordKeyCalled = true;
      recordedKey = key;
      recordedId = id;
    }
  };

  const useCase = new RejectApprovalUseCase(mockRepository, mockIdempotencyService);
  await useCase.execute('pending-id', 'user123', 'reason', 'key-456');

  assert.ok(recordKeyCalled, 'recordKey should be called');
  assert.equal(recordedKey, 'key-456', 'Should record the correct key');
  assert.equal(recordedId, 'pending-id', 'Should record the correct approval ID');
});
