package com.phase0demo.approve.adapter.out.persistence;

import com.phase0demo.approve.application.port.out.ApprovalRepository;
import com.phase0demo.approve.domain.ApprovalRequest;
import com.phase0demo.approve.domain.ApprovalStatus;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class JpaApprovalRepository implements ApprovalRepository {
    private final ConcurrentHashMap<UUID, ApprovalRequestEntity> storage = new ConcurrentHashMap<>();

    @Override
    public Optional<ApprovalRequest> findById(UUID id) {
        return Optional.ofNullable(storage.get(id))
            .map(this::toDomain);
    }

    @Override
    public ApprovalRequest save(ApprovalRequest approvalRequest) {
        ApprovalRequestEntity entity = toEntity(approvalRequest);
        storage.put(approvalRequest.getId(), entity);
        return approvalRequest;
    }

    private ApprovalRequest toDomain(ApprovalRequestEntity entity) {
        ApprovalRequest domain = new ApprovalRequest(
            entity.id,
            entity.requesterId,
            entity.resourceId
        );
        
        if (entity.status == ApprovalStatus.APPROVED) {
            domain.approve(entity.reviewerId, entity.reviewComment);
        } else if (entity.status == ApprovalStatus.REJECTED) {
            domain.reject(entity.reviewerId, entity.reviewComment);
        } else if (entity.status == ApprovalStatus.CANCELLED) {
            domain.cancel(entity.requesterId);
        }
        
        return domain;
    }

    private ApprovalRequestEntity toEntity(ApprovalRequest domain) {
        ApprovalRequestEntity entity = new ApprovalRequestEntity();
        entity.id = domain.getId();
        entity.requesterId = domain.getRequesterId();
        entity.resourceId = domain.getResourceId();
        entity.status = domain.getStatus();
        entity.reviewerId = domain.getReviewerId();
        entity.reviewComment = domain.getReviewComment();
        entity.createdAt = domain.getCreatedAt();
        entity.updatedAt = domain.getUpdatedAt();
        return entity;
    }

    static class ApprovalRequestEntity {
        UUID id;
        String requesterId;
        String resourceId;
        ApprovalStatus status;
        String reviewerId;
        String reviewComment;
        java.time.Instant createdAt;
        java.time.Instant updatedAt;
    }
}
