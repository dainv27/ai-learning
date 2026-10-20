package com.phase0demo.approve.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApprovalRepository {
    Optional<Approval> findById(UUID id);
    Optional<Approval> findByIdWithLock(UUID id);
    List<Approval> findByResourceId(String resourceId);
    List<Approval> findByStatus(ApprovalStatus status);
    Approval save(Approval approval);
    boolean existsByIdempotencyKey(String idempotencyKey);
    Optional<Approval> findByIdempotencyKey(String idempotencyKey);
    void saveIdempotencyKey(String idempotencyKey, UUID approvalId);
}