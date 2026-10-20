package com.phase0demo.approve.domain;

import java.time.Instant;
import java.util.UUID;

public class ApprovalRequest {
    private final UUID id;
    private final String requesterId;
    private final String resourceId;
    private ApprovalStatus status;
    private String reviewerId;
    private String reviewComment;
    private final Instant createdAt;
    private Instant updatedAt;

    public ApprovalRequest(UUID id, String requesterId, String resourceId) {
        if (requesterId == null || requesterId.isBlank()) {
            throw new IllegalArgumentException("Requester ID cannot be null or blank");
        }
        if (resourceId == null || resourceId.isBlank()) {
            throw new IllegalArgumentException("Resource ID cannot be null or blank");
        }
        this.id = id;
        this.requesterId = requesterId;
        this.resourceId = resourceId;
        this.status = ApprovalStatus.PENDING;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void approve(String reviewerId, String comment) {
        validateStateTransition(ApprovalStatus.APPROVED);
        if (reviewerId == null || reviewerId.isBlank()) {
            throw new IllegalArgumentException("Reviewer ID cannot be null or blank");
        }
        this.status = ApprovalStatus.APPROVED;
        this.reviewerId = reviewerId;
        this.reviewComment = comment;
        this.updatedAt = Instant.now();
    }

    public void reject(String reviewerId, String comment) {
        validateStateTransition(ApprovalStatus.REJECTED);
        if (reviewerId == null || reviewerId.isBlank()) {
            throw new IllegalArgumentException("Reviewer ID cannot be null or blank");
        }
        if (comment == null || comment.isBlank()) {
            throw new IllegalArgumentException("Rejection comment is required");
        }
        this.status = ApprovalStatus.REJECTED;
        this.reviewerId = reviewerId;
        this.reviewComment = comment;
        this.updatedAt = Instant.now();
    }

    public void cancel(String cancelledBy) {
        validateStateTransition(ApprovalStatus.CANCELLED);
        if (cancelledBy == null || cancelledBy.isBlank()) {
            throw new IllegalArgumentException("Cancellation initiator cannot be null or blank");
        }
        if (!cancelledBy.equals(requesterId)) {
            throw new IllegalStateException("Only the requester can cancel the approval request");
        }
        this.status = ApprovalStatus.CANCELLED;
        this.updatedAt = Instant.now();
    }

    private void validateStateTransition(ApprovalStatus targetStatus) {
        if (!status.canTransitionTo(targetStatus)) {
            throw new InvalidStateTransitionException(
                String.format("Cannot transition from %s to %s", status, targetStatus)
            );
        }
    }

    public UUID getId() {
        return id;
    }

    public String getRequesterId() {
        return requesterId;
    }

    public String getResourceId() {
        return resourceId;
    }

    public ApprovalStatus getStatus() {
        return status;
    }

    public String getReviewerId() {
        return reviewerId;
    }

    public String getReviewComment() {
        return reviewComment;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
