package com.phase0demo.approve.domain;

import java.time.Instant;
import java.util.UUID;

public class Approval {
    private final UUID id;
    private final String resourceId;
    private final String resourceType;
    private final String requesterId;
    private ApprovalStatus status;
    private String approverId;
    private String comment;
    private final Instant createdAt;
    private Instant updatedAt;
    private int version;

    public Approval(UUID id, String resourceId, String resourceType, String requesterId,
                    ApprovalStatus status, String approverId, String comment,
                    Instant createdAt, Instant updatedAt, int version) {
        this.id = id;
        this.resourceId = resourceId;
        this.resourceType = resourceType;
        this.requesterId = requesterId;
        this.status = status;
        this.approverId = approverId;
        this.comment = comment;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.version = version;
    }

    public void approve(String approverId, String comment, Instant now) {
        if (!status.canTransitionTo(ApprovalStatus.APPROVED)) {
            throw new IllegalStateException(
                "Cannot transition from " + status + " to APPROVED");
        }
        this.status = ApprovalStatus.APPROVED;
        this.approverId = approverId;
        this.comment = comment;
        this.updatedAt = now;
    }

    public void reject(String approverId, String comment, Instant now) {
        if (!status.canTransitionTo(ApprovalStatus.REJECTED)) {
            throw new IllegalStateException(
                "Cannot transition from " + status + " to REJECTED");
        }
        this.status = ApprovalStatus.REJECTED;
        this.approverId = approverId;
        this.comment = comment;
        this.updatedAt = now;
    }

    public void cancel(Instant now) {
        if (!status.canTransitionTo(ApprovalStatus.CANCELLED)) {
            throw new IllegalStateException(
                "Cannot transition from " + status + " to CANCELLED");
        }
        this.status = ApprovalStatus.CANCELLED;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public String getResourceId() { return resourceId; }
    public String getResourceType() { return resourceType; }
    public String getRequesterId() { return requesterId; }
    public ApprovalStatus getStatus() { return status; }
    public String getApproverId() { return approverId; }
    public String getComment() { return comment; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public int getVersion() { return version; }
}