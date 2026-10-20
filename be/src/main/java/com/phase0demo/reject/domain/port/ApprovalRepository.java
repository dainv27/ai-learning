package com.phase0demo.reject.domain.port;

import com.phase0demo.reject.domain.model.Approval;

import java.util.Optional;
import java.util.UUID;

public interface ApprovalRepository {
    Optional<Approval> findById(UUID id);
    Approval save(Approval approval);
    Optional<Approval> findByIdempotencyKey(String idempotencyKey);
}
