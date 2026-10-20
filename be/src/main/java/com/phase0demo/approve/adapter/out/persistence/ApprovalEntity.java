package com.phase0demo.approve.adapter.out.persistence;

import com.phase0demo.approve.domain.Approval;
import com.phase0demo.approve.domain.ApprovalStatus;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "approvals")
public class ApprovalEntity {
    @Id
    private UUID id;

    @Column(nullable = false)
    private String resourceId;

    @Column(nullable = false)
    private String resourceType;

    @Column(nullable = false)
    private String requesterId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApprovalStatus status;

    private String approverId;

    @Column(length = 1000)
    private String comment;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @Version
    private int version;

    protected ApprovalEntity() {}

    public ApprovalEntity(UUID id, String resourceId, String resourceType,
                         String requesterId, ApprovalStatus status, String approverId,
                         String comment, Instant createdAt, Instant updatedAt, int version) {
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

    public static ApprovalEntity fromDomain(Approval approval) {
        return new ApprovalEntity(
            approval.getId(),
            approval.getResourceId(),
            approval.getResourceType(),
            approval.getRequesterId(),
            approval.getStatus(),
            approval.getApproverId(),
            approval.getComment(),
            approval.getCreatedAt(),
            approval.getUpdatedAt(),
            approval.getVersion()
        );
    }

    public Approval toDomain() {
        return new Approval(
            id,
            resourceId,
            resourceType,
            requesterId,
            status,
            approverId,
            comment,
            createdAt,
            updatedAt,
            version
        );
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