package com.phase0demo.approve.application.port;

import com.phase0demo.approve.domain.Approval;

import java.util.Optional;
import java.util.UUID;

public interface ApprovalRepository {
    Optional<Approval> findById(UUID id);
    Approval save(Approval approval);
}
