package com.phase0demo.approve.domain;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ApprovalRequestTest {

    @Test
    void shouldCreatePendingApprovalRequest() {
        UUID id = UUID.randomUUID();
        ApprovalRequest request = new ApprovalRequest(id, "user-123", "resource-456");

        assertEquals(id, request.getId());
        assertEquals("user-123", request.getRequesterId());
        assertEquals("resource-456", request.getResourceId());
        assertEquals(ApprovalStatus.PENDING, request.getStatus());
        assertNull(request.getReviewerId());
        assertNull(request.getReviewComment());
    }

    @Test
    void shouldRejectNullRequesterId() {
        UUID id = UUID.randomUUID();
        assertThrows(IllegalArgumentException.class, () -> 
            new ApprovalRequest(id, null, "resource-456")
        );
    }

    @Test
    void shouldRejectBlankRequesterId() {
        UUID id = UUID.randomUUID();
        assertThrows(IllegalArgumentException.class, () -> 
            new ApprovalRequest(id, "  ", "resource-456")
        );
    }

    @Test
    void shouldRejectNullResourceId() {
        UUID id = UUID.randomUUID();
        assertThrows(IllegalArgumentException.class, () -> 
            new ApprovalRequest(id, "user-123", null)
        );
    }

    @Test
    void shouldApprovePendingRequest() {
        ApprovalRequest request = new ApprovalRequest(UUID.randomUUID(), "user-123", "resource-456");
        
        request.approve("reviewer-789", "Looks good");

        assertEquals(ApprovalStatus.APPROVED, request.getStatus());
        assertEquals("reviewer-789", request.getReviewerId());
        assertEquals("Looks good", request.getReviewComment());
    }

    @Test
    void shouldRejectPendingRequest() {
        ApprovalRequest request = new ApprovalRequest(UUID.randomUUID(), "user-123", "resource-456");
        
        request.reject("reviewer-789", "Not compliant");

        assertEquals(ApprovalStatus.REJECTED, request.getStatus());
        assertEquals("reviewer-789", request.getReviewerId());
        assertEquals("Not compliant", request.getReviewComment());
    }

    @Test
    void shouldCancelPendingRequest() {
        ApprovalRequest request = new ApprovalRequest(UUID.randomUUID(), "user-123", "resource-456");
        
        request.cancel("user-123");

        assertEquals(ApprovalStatus.CANCELLED, request.getStatus());
    }

    @Test
    void shouldNotAllowNonRequesterToCancel() {
        ApprovalRequest request = new ApprovalRequest(UUID.randomUUID(), "user-123", "resource-456");
        
        assertThrows(IllegalStateException.class, () -> 
            request.cancel("other-user")
        );
    }

    @Test
    void shouldNotAllowApprovalOfApprovedRequest() {
        ApprovalRequest request = new ApprovalRequest(UUID.randomUUID(), "user-123", "resource-456");
        request.approve("reviewer-789", "Approved");

        assertThrows(InvalidStateTransitionException.class, () -> 
            request.approve("reviewer-999", "Approved again")
        );
    }

    @Test
    void shouldNotAllowRejectionOfApprovedRequest() {
        ApprovalRequest request = new ApprovalRequest(UUID.randomUUID(), "user-123", "resource-456");
        request.approve("reviewer-789", "Approved");

        assertThrows(InvalidStateTransitionException.class, () -> 
            request.reject("reviewer-999", "Changed my mind")
        );
    }

    @Test
    void shouldNotAllowCancellationOfApprovedRequest() {
        ApprovalRequest request = new ApprovalRequest(UUID.randomUUID(), "user-123", "resource-456");
        request.approve("reviewer-789", "Approved");

        assertThrows(InvalidStateTransitionException.class, () -> 
            request.cancel("user-123")
        );
    }

    @Test
    void shouldNotAllowApprovalOfRejectedRequest() {
        ApprovalRequest request = new ApprovalRequest(UUID.randomUUID(), "user-123", "resource-456");
        request.reject("reviewer-789", "Not good");

        assertThrows(InvalidStateTransitionException.class, () -> 
            request.approve("reviewer-999", "Actually it's fine")
        );
    }

    @Test
    void shouldNotAllowApprovalOfCancelledRequest() {
        ApprovalRequest request = new ApprovalRequest(UUID.randomUUID(), "user-123", "resource-456");
        request.cancel("user-123");

        assertThrows(InvalidStateTransitionException.class, () -> 
            request.approve("reviewer-789", "Approved")
        );
    }

    @Test
    void shouldRequireReviewerIdForApproval() {
        ApprovalRequest request = new ApprovalRequest(UUID.randomUUID(), "user-123", "resource-456");
        
        assertThrows(IllegalArgumentException.class, () -> 
            request.approve(null, "Comment")
        );
    }

    @Test
    void shouldRequireReviewerIdForRejection() {
        ApprovalRequest request = new ApprovalRequest(UUID.randomUUID(), "user-123", "resource-456");
        
        assertThrows(IllegalArgumentException.class, () -> 
            request.reject(null, "Comment")
        );
    }

    @Test
    void shouldRequireCommentForRejection() {
        ApprovalRequest request = new ApprovalRequest(UUID.randomUUID(), "user-123", "resource-456");
        
        assertThrows(IllegalArgumentException.class, () -> 
            request.reject("reviewer-789", null)
        );
    }

    @Test
    void shouldAllowNullCommentForApproval() {
        ApprovalRequest request = new ApprovalRequest(UUID.randomUUID(), "user-123", "resource-456");
        
        assertDoesNotThrow(() -> request.approve("reviewer-789", null));
        assertEquals(ApprovalStatus.APPROVED, request.getStatus());
    }
}
