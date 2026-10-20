package com.phase0demo.approve.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "approvals")
public class Approval {

    @Id
    private UUID id;

    @Column(name = "resource_type", nullable = false, length = 100)
    private String resourceType;

    @Column(name = "resource_id", nullable = false)
    private String resourceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ApprovalStatus status;

    @Column(name = "requester_id", nullable = false)
    private String requesterId;

    @Column(name = "approver_id")
    private String approverId;

    @Column(name = "reason", columnDefinition = "text")
    private String reason;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "rejected_at")
    private Instant rejectedAt;

    @Version
    @Column(name = "version")
    private Long version;

    protected Approval() {
    }

    public Approval(String resourceType, String resourceId, String requesterId, String reason) {
        this.id = UUID.randomUUID();
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.requesterId = requesterId;
        this.reason = reason;
        this.status = ApprovalStatus.PENDING;
        this.requestedAt = Instant.now();
    }

    public void approve(String approverId) {
        if (this.status != ApprovalStatus.PENDING) {
            throw new IllegalStateException("Only pending approvals can be approved. Current status: " + this.status);
        }
        this.status = ApprovalStatus.APPROVED;
        this.approverId = approverId;
        this.approvedAt = Instant.now();
    }

    public void reject(String approverId, String reason) {
        if (this.status != ApprovalStatus.PENDING) {
            throw new IllegalStateException("Only pending approvals can be rejected. Current status: " + this.status);
        }
        this.status = ApprovalStatus.REJECTED;
        this.approverId = approverId;
        this.reason = reason;
        this.rejectedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getResourceType() {
        return resourceType;
    }

    public String getResourceId() {
        return resourceId;
    }

    public ApprovalStatus getStatus() {
        return status;
    }

    public String getRequesterId() {
        return requesterId;
    }

    public String getApproverId() {
        return approverId;
    }

    public String getReason() {
        return reason;
    }

    public Instant getRequestedAt() {
        return requestedAt;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public Instant getRejectedAt() {
        return rejectedAt;
    }

    public Long getVersion() {
        return version;
    }
}
