package com.phase0demo.approve.domain;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class ApprovalTest {
    @Test
    void approveFromPendingSucceeds() {
        Approval approval = createPendingApproval();
        Instant now = Instant.now();

        approval.approve("approver-1", "Looks good", now);

        assertEquals(ApprovalStatus.APPROVED, approval.getStatus());
        assertEquals("approver-1", approval.getApproverId());
        assertEquals("Looks good", approval.getComment());
        assertEquals(now, approval.getUpdatedAt());
    }

    @Test
    void rejectFromPendingSucceeds() {
        Approval approval = createPendingApproval();
        Instant now = Instant.now();

        approval.reject("approver-1", "Needs work", now);

        assertEquals(ApprovalStatus.REJECTED, approval.getStatus());
        assertEquals("approver-1", approval.getApproverId());
        assertEquals("Needs work", approval.getComment());
        assertEquals(now, approval.getUpdatedAt());
    }

    @Test
    void cancelFromPendingSucceeds() {
        Approval approval = createPendingApproval();
        Instant now = Instant.now();

        approval.cancel(now);

        assertEquals(ApprovalStatus.CANCELLED, approval.getStatus());
        assertEquals(now, approval.getUpdatedAt());
    }

    @Test
    void approveFromApprovedFails() {
        Approval approval = createApprovedApproval();

        assertThrows(IllegalStateException.class, () ->
            approval.approve("approver-2", "Double approve", Instant.now()));
    }

    @Test
    void rejectFromApprovedFails() {
        Approval approval = createApprovedApproval();

        assertThrows(IllegalStateException.class, () ->
            approval.reject("approver-2", "Too late", Instant.now()));
    }

    @Test
    void approveFromRejectedFails() {
        Approval approval = createRejectedApproval();

        assertThrows(IllegalStateException.class, () ->
            approval.approve("approver-2", "Changed mind", Instant.now()));
    }

    @Test
    void cancelFromApprovedFails() {
        Approval approval = createApprovedApproval();

        assertThrows(IllegalStateException.class, () ->
            approval.cancel(Instant.now()));
    }

    private Approval createPendingApproval() {
        Instant now = Instant.now();
        return new Approval(
            UUID.randomUUID(),
            "resource-123",
            "document",
            "requester-1",
            ApprovalStatus.PENDING,
            null,
            null,
            now,
            now,
            0
        );
    }

    private Approval createApprovedApproval() {
        Instant now = Instant.now();
        return new Approval(
            UUID.randomUUID(),
            "resource-123",
            "document",
            "requester-1",
            ApprovalStatus.APPROVED,
            "approver-1",
            "Approved",
            now,
            now,
            1
        );
    }

    private Approval createRejectedApproval() {
        Instant now = Instant.now();
        return new Approval(
            UUID.randomUUID(),
            "resource-123",
            "document",
            "requester-1",
            ApprovalStatus.REJECTED,
            "approver-1",
            "Rejected",
            now,
            now,
            1
        );
    }
}