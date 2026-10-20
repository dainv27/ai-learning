package com.phase0demo.approve.domain;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ApprovalStatusTest {
    @Test
    void pendingCanTransitionToApproved() {
        assertTrue(ApprovalStatus.PENDING.canTransitionTo(ApprovalStatus.APPROVED));
    }

    @Test
    void pendingCanTransitionToRejected() {
        assertTrue(ApprovalStatus.PENDING.canTransitionTo(ApprovalStatus.REJECTED));
    }

    @Test
    void pendingCanTransitionToCancelled() {
        assertTrue(ApprovalStatus.PENDING.canTransitionTo(ApprovalStatus.CANCELLED));
    }

    @Test
    void approvedCannotTransitionToAnyState() {
        assertFalse(ApprovalStatus.APPROVED.canTransitionTo(ApprovalStatus.PENDING));
        assertFalse(ApprovalStatus.APPROVED.canTransitionTo(ApprovalStatus.REJECTED));
        assertFalse(ApprovalStatus.APPROVED.canTransitionTo(ApprovalStatus.CANCELLED));
    }

    @Test
    void rejectedCannotTransitionToAnyState() {
        assertFalse(ApprovalStatus.REJECTED.canTransitionTo(ApprovalStatus.PENDING));
        assertFalse(ApprovalStatus.REJECTED.canTransitionTo(ApprovalStatus.APPROVED));
        assertFalse(ApprovalStatus.REJECTED.canTransitionTo(ApprovalStatus.CANCELLED));
    }

    @Test
    void cancelledCannotTransitionToAnyState() {
        assertFalse(ApprovalStatus.CANCELLED.canTransitionTo(ApprovalStatus.PENDING));
        assertFalse(ApprovalStatus.CANCELLED.canTransitionTo(ApprovalStatus.APPROVED));
        assertFalse(ApprovalStatus.CANCELLED.canTransitionTo(ApprovalStatus.REJECTED));
    }

    @Test
    void terminalStatesAreCorrect() {
        assertFalse(ApprovalStatus.PENDING.isTerminal());
        assertTrue(ApprovalStatus.APPROVED.isTerminal());
        assertTrue(ApprovalStatus.REJECTED.isTerminal());
        assertTrue(ApprovalStatus.CANCELLED.isTerminal());
    }
}