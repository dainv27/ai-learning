package com.phase0demo.approve.domain;

import java.util.Set;

public enum ApprovalStatus {
    PENDING(Set.of(APPROVED, REJECTED, CANCELLED)),
    APPROVED(Set.of()),
    REJECTED(Set.of()),
    CANCELLED(Set.of());

    private final Set<ApprovalStatus> allowedTransitions;

    ApprovalStatus(Set<ApprovalStatus> allowedTransitions) {
        this.allowedTransitions = allowedTransitions;
    }

    public boolean canTransitionTo(ApprovalStatus target) {
        return allowedTransitions.contains(target);
    }
}
