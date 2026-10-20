package com.phase0demo.approve.application.port.in;

import java.util.UUID;

public interface ApproveUseCase {
    ApprovalResult approve(ApprovalCommand command);

    record ApprovalCommand(
        UUID approvalRequestId,
        String reviewerId,
        String comment,
        String idempotencyKey
    ) {
        public ApprovalCommand {
            if (approvalRequestId == null) {
                throw new IllegalArgumentException("Approval request ID cannot be null");
            }
            if (reviewerId == null || reviewerId.isBlank()) {
                throw new IllegalArgumentException("Reviewer ID cannot be null or blank");
            }
            if (idempotencyKey == null || idempotencyKey.isBlank()) {
                throw new IllegalArgumentException("Idempotency key is required");
            }
        }
    }

    record ApprovalResult(
        UUID approvalRequestId,
        String status,
        boolean wasIdempotent
    ) {}
}
