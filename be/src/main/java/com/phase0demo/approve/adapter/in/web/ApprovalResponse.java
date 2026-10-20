package com.phase0demo.approve.adapter.in.web;

import com.phase0demo.approve.domain.Approval;
import com.phase0demo.approve.domain.ApprovalStatus;

import java.time.Instant;
import java.util.UUID;

public record ApprovalResponse(
    UUID id,
    String resourceId,
    String resourceType,
    String requesterId,
    ApprovalStatus status,
    String approverId,
    String comment,
    Instant createdAt,
    Instant updatedAt
) {
    public static ApprovalResponse fromDomain(Approval approval) {
        return new ApprovalResponse(
            approval.getId(),
            approval.getResourceId(),
            approval.getResourceType(),
            approval.getRequesterId(),
            approval.getStatus(),
            approval.getApproverId(),
            approval.getComment(),
            approval.getCreatedAt(),
            approval.getUpdatedAt()
        );
    }
}