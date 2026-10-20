package com.phase0demo.approve.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ApprovalTest {

    @Test
    void approve_fromPending_succeeds() {
        Approval approval = new Approval(
            UUID.randomUUID(),
            "requester1",
            ApprovalStatus.PENDING,
            null,
            null,
            Instant.now(),
            Instant.now()
        );

        approval.approve("approver1", "Looks good");

        assertEquals(ApprovalStatus.APPROVED, approval.getStatus());
        assertEquals("approver1", approval.getApproverId());
        assertEquals("Looks good", approval.getComment());
    }

    @Test
    void approve_fromApproved_throwsIllegalStateException() {
        Approval approval = new Approval(
            UUID.randomUUID(),
            "requester1",
            ApprovalStatus.APPROVED,
            "Already approved",
            "approver1",
            Instant.now(),
            Instant.now()
        );

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            approval.approve("approver2", "Approve again");
        });

        assertTrue(exception.getMessage().contains("Cannot approve: approval is already APPROVED"));
    }

    @Test
    void approve_fromRejected_throwsIllegalStateException() {
        Approval approval = new Approval(
            UUID.randomUUID(),
            "requester1",
            ApprovalStatus.REJECTED,
            "Already rejected",
            "approver1",
            Instant.now(),
            Instant.now()
        );

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            approval.approve("approver2", "Try to approve");
        });

        assertTrue(exception.getMessage().contains("Cannot approve: approval is already REJECTED"));
    }

    @Test
    void reject_fromPending_succeeds() {
        Approval approval = new Approval(
            UUID.randomUUID(),
            "requester1",
            ApprovalStatus.PENDING,
            null,
            null,
            Instant.now(),
            Instant.now()
        );

        approval.reject("approver1", "Not acceptable");

        assertEquals(ApprovalStatus.REJECTED, approval.getStatus());
        assertEquals("approver1", approval.getApproverId());
        assertEquals("Not acceptable", approval.getComment());
    }

    @Test
    void reject_fromApproved_throwsIllegalStateException() {
        Approval approval = new Approval(
            UUID.randomUUID(),
            "requester1",
            ApprovalStatus.APPROVED,
            "Already approved",
            "approver1",
            Instant.now(),
            Instant.now()
        );

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            approval.reject("approver2", "Try to reject");
        });

        assertTrue(exception.getMessage().contains("Cannot reject: approval is already APPROVED"));
    }

    @Test
    void reject_fromRejected_throwsIllegalStateException() {
        Approval approval = new Approval(
            UUID.randomUUID(),
            "requester1",
            ApprovalStatus.REJECTED,
            "Already rejected",
            "approver1",
            Instant.now(),
            Instant.now()
        );

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            approval.reject("approver2", "Reject again");
        });

        assertTrue(exception.getMessage().contains("Cannot reject: approval is already REJECTED"));
    }
}
