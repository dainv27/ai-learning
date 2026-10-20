package com.phase0demo.approve.adapter.rest;

import java.time.Instant;
import java.util.UUID;

public record ApprovalResponse(
    UUID id,
    String resourceType,
    String resourceId,
    String status,
    String requesterId,
    String approverId,
    String reason,
    Instant requestedAt,
    Instant approvedAt,
    Instant rejectedAt
) {}
