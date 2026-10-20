package com.phase0demo.reject.domain.model;

import java.time.Instant;
import java.util.UUID;

public class Approval {
    private UUID id;
    private String requesterId;
    private String description;
    private ApprovalStatus status;
    private String approverId;
    private String comment;
    private Instant createdAt;
    private Instant updatedAt;

    public Approval(UUID id, String requesterId, String description, ApprovalStatus status,
                    String approverId, String comment, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.requesterId = requesterId;
        this.description = description;
        this.status = status;
        this.approverId = approverId;
        this.comment = comment;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public void approve(String userId, String approvalComment) {
        if (this.status != ApprovalStatus.PENDING) {
            throw new InvalidStateTransitionException(
                "Cannot approve approval in status " + this.status + ". Only PENDING approvals can be approved.");
        }
        this.status = ApprovalStatus.APPROVED;
        this.approverId = userId;
        this.comment = approvalComment;
        this.updatedAt = Instant.now();
    }

    public void reject(String userId, String rejectionComment) {
        if (this.status != ApprovalStatus.PENDING) {
            throw new InvalidStateTransitionException(
                "Cannot reject approval in status " + this.status + ". Only PENDING approvals can be rejected.");
        }
        this.status = ApprovalStatus.REJECTED;
        this.approverId = userId;
        this.comment = rejectionComment;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getRequesterId() {
        return requesterId;
    }

    public String getDescription() {
        return description;
    }

    public ApprovalStatus getStatus() {
        return status;
    }

    public String getApproverId() {
        return approverId;
    }

    public String getComment() {
        return comment;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
