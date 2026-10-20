package com.phase0demo.reject.adapter.web;

import java.time.Instant;
import java.util.UUID;

public record ApprovalResponse(
    UUID id,
    String requesterId,
    String description,
    String status,
    String approverId,
    String comment,
    Instant createdAt,
    Instant updatedAt
) {
}
