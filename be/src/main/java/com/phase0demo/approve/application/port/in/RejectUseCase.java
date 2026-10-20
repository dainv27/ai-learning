package com.phase0demo.approve.application.port.in;

import java.util.UUID;

public interface RejectUseCase {
    RejectionResult reject(RejectionCommand command);

    record RejectionCommand(
        UUID approvalRequestId,
        String reviewerId,
        String comment,
        String idempotencyKey
    ) {
        public RejectionCommand {
            if (approvalRequestId == null) {
                throw new IllegalArgumentException("Approval request ID cannot be null");
            }
            if (reviewerId == null || reviewerId.isBlank()) {
                throw new IllegalArgumentException("Reviewer ID cannot be null or blank");
            }
            if (comment == null || comment.isBlank()) {
                throw new IllegalArgumentException("Rejection comment is required");
            }
            if (idempotencyKey == null || idempotencyKey.isBlank()) {
                throw new IllegalArgumentException("Idempotency key is required");
            }
        }
    }

    record RejectionResult(
        UUID approvalRequestId,
        String status,
        boolean wasIdempotent
    ) {}
}
