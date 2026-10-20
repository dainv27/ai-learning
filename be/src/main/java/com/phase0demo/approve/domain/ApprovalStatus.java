package com.phase0demo.approve.domain;

public enum ApprovalStatus {
    PENDING,
    APPROVED,
    REJECTED,
    CANCELLED;

    public boolean canTransitionTo(ApprovalStatus target) {
        return switch (this) {
            case PENDING -> target == APPROVED || target == REJECTED || target == CANCELLED;
            case APPROVED, REJECTED, CANCELLED -> false;
        };
    }

    public boolean isTerminal() {
        return this == APPROVED || this == REJECTED || this == CANCELLED;
    }
}