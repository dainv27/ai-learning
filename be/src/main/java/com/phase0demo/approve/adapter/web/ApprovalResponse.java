package com.phase0demo.approve.adapter.web;

import java.time.Instant;
import java.util.UUID;

public record ApprovalResponse(
    UUID id,
    String requesterId,
    String status,
    String comment,
    String approverId,
    Instant createdAt,
    Instant updatedAt
) {
}
