package com.phase0demo.approve.application.port.in;

import java.util.UUID;

public record RejectCommand(
    UUID approvalId,
    String approverId,
    String comment,
    String idempotencyKey
) {
    public RejectCommand {
        if (approvalId == null) {
            throw new IllegalArgumentException("Approval ID cannot be null");
        }
        if (approverId == null || approverId.isBlank()) {
            throw new IllegalArgumentException("Approver ID cannot be null or blank");
        }
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("Idempotency key cannot be null or blank");
        }
    }
}