package com.phase0demo.reject.application;

import com.phase0demo.reject.domain.model.Approval;
import com.phase0demo.reject.domain.model.ApprovalNotFoundException;
import com.phase0demo.reject.domain.model.ApprovalStatus;
import com.phase0demo.reject.domain.model.InvalidStateTransitionException;
import com.phase0demo.reject.domain.port.ApprovalRepository;
import com.phase0demo.reject.domain.port.IdempotencyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RejectApprovalUseCaseTest {
    @Mock
    private ApprovalRepository approvalRepository;

    @Mock
    private IdempotencyService idempotencyService;

    private RejectApprovalUseCase useCase;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        useCase = new RejectApprovalUseCase(approvalRepository, idempotencyService);
    }

    @Test
    void shouldRejectPendingApproval() {
        UUID approvalId = UUID.randomUUID();
        String userId = "user123";
        String comment = "Not acceptable";
        String idempotencyKey = "key-123";

        Approval pendingApproval = new Approval(
            approvalId,
            "requester",
            "Test approval",
            ApprovalStatus.PENDING,
            null,
            null,
            Instant.now(),
            Instant.now()
        );

        when(approvalRepository.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.empty());
        when(approvalRepository.findById(approvalId)).thenReturn(Optional.of(pendingApproval));
        when(approvalRepository.save(any(Approval.class))).thenAnswer(inv -> inv.getArgument(0));

        Approval result = useCase.execute(approvalId, userId, comment, idempotencyKey);

        assertEquals(ApprovalStatus.REJECTED, result.getStatus());
        assertEquals(userId, result.getApproverId());
        assertEquals(comment, result.getComment());
        verify(idempotencyService).recordKey(idempotencyKey, approvalId);
    }

    @Test
    void shouldThrowWhenApprovalNotFound() {
        UUID approvalId = UUID.randomUUID();
        String idempotencyKey = "key-123";

        when(approvalRepository.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.empty());
        when(approvalRepository.findById(approvalId)).thenReturn(Optional.empty());

        assertThrows(ApprovalNotFoundException.class, () ->
            useCase.execute(approvalId, "user", "comment", idempotencyKey)
        );
    }

    @Test
    void shouldThrowWhenApprovalAlreadyApproved() {
        UUID approvalId = UUID.randomUUID();
        String idempotencyKey = "key-123";

        Approval approvedApproval = new Approval(
            approvalId,
            "requester",
            "Test approval",
            ApprovalStatus.APPROVED,
            "approver",
            "Approved",
            Instant.now(),
            Instant.now()
        );

        when(approvalRepository.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.empty());
        when(approvalRepository.findById(approvalId)).thenReturn(Optional.of(approvedApproval));

        assertThrows(InvalidStateTransitionException.class, () ->
            useCase.execute(approvalId, "user", "comment", idempotencyKey)
        );
    }

    @Test
    void shouldThrowWhenApprovalAlreadyRejected() {
        UUID approvalId = UUID.randomUUID();
        String idempotencyKey = "key-123";

        Approval rejectedApproval = new Approval(
            approvalId,
            "requester",
            "Test approval",
            ApprovalStatus.REJECTED,
            "rejector",
            "Rejected",
            Instant.now(),
            Instant.now()
        );

        when(approvalRepository.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.empty());
        when(approvalRepository.findById(approvalId)).thenReturn(Optional.of(rejectedApproval));

        assertThrows(InvalidStateTransitionException.class, () ->
            useCase.execute(approvalId, "user", "comment", idempotencyKey)
        );
    }

    @Test
    void shouldReturnCachedResultForIdempotentRequest() {
        UUID approvalId = UUID.randomUUID();
        String idempotencyKey = "key-123";

        Approval cachedApproval = new Approval(
            approvalId,
            "requester",
            "Test approval",
            ApprovalStatus.REJECTED,
            "user123",
            "Already rejected",
            Instant.now(),
            Instant.now()
        );

        when(approvalRepository.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.of(cachedApproval));

        Approval result = useCase.execute(approvalId, "user123", "New comment", idempotencyKey);

        assertEquals(cachedApproval, result);
        verify(approvalRepository, never()).findById(any());
        verify(approvalRepository, never()).save(any());
        verify(idempotencyService, never()).recordKey(any(), any());
    }
}
