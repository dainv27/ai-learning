package com.phase0demo.approve.domain;

import java.time.Instant;
import java.util.UUID;

public class Approval {
    private UUID id;
    private String requesterId;
    private ApprovalStatus status;
    private String comment;
    private String approverId;
    private Instant createdAt;
    private Instant updatedAt;

    public Approval(UUID id, String requesterId, ApprovalStatus status, String comment, String approverId, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.requesterId = requesterId;
        this.status = status;
        this.comment = comment;
        this.approverId = approverId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public void approve(String approverId, String comment) {
        if (this.status != ApprovalStatus.PENDING) {
            throw new IllegalStateException("Cannot approve: approval is already " + this.status);
        }
        this.status = ApprovalStatus.APPROVED;
        this.approverId = approverId;
        this.comment = comment;
        this.updatedAt = Instant.now();
    }

    public void reject(String approverId, String comment) {
        if (this.status != ApprovalStatus.PENDING) {
            throw new IllegalStateException("Cannot reject: approval is already " + this.status);
        }
        this.status = ApprovalStatus.REJECTED;
        this.approverId = approverId;
        this.comment = comment;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getRequesterId() {
        return requesterId;
    }

    public ApprovalStatus getStatus() {
        return status;
    }

    public String getComment() {
        return comment;
    }

    public String getApproverId() {
        return approverId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
