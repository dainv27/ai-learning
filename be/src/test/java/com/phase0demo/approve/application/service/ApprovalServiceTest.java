package com.phase0demo.approve.application.service;

import com.phase0demo.approve.application.port.in.ApproveUseCase;
import com.phase0demo.approve.application.port.in.RejectUseCase;
import com.phase0demo.approve.application.port.out.ApprovalRepository;
import com.phase0demo.approve.application.port.out.IdempotencyRepository;
import com.phase0demo.approve.domain.ApprovalRequest;
import com.phase0demo.approve.domain.ApprovalStatus;
import com.phase0demo.approve.domain.InvalidStateTransitionException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ApprovalServiceTest {
    private ApprovalRepository approvalRepository;
    private IdempotencyRepository idempotencyRepository;
    private ApprovalService service;

    @BeforeEach
    void setUp() {
        approvalRepository = mock(ApprovalRepository.class);
        idempotencyRepository = mock(IdempotencyRepository.class);
        service = new ApprovalService(approvalRepository, idempotencyRepository);
    }

    @Test
    void shouldApproveExistingPendingRequest() {
        UUID id = UUID.randomUUID();
        ApprovalRequest request = new ApprovalRequest(id, "user-123", "resource-456");
        when(approvalRepository.findById(id)).thenReturn(Optional.of(request));
        when(idempotencyRepository.findResult("idem-key-1")).thenReturn(Optional.empty());
        when(approvalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ApproveUseCase.ApprovalCommand command = new ApproveUseCase.ApprovalCommand(
            id, "reviewer-789", "Approved", "idem-key-1"
        );

        ApproveUseCase.ApprovalResult result = service.approve(command);

        assertEquals(id, result.approvalRequestId());
        assertEquals("APPROVED", result.status());
        assertFalse(result.wasIdempotent());
        verify(approvalRepository).save(any(ApprovalRequest.class));
        verify(idempotencyRepository).recordOperation("idem-key-1", "APPROVED");
    }

    @Test
    void shouldReturnCachedResultForDuplicateApprovalRequest() {
        UUID id = UUID.randomUUID();
        when(idempotencyRepository.findResult("idem-key-1")).thenReturn(Optional.of("APPROVED"));

        ApproveUseCase.ApprovalCommand command = new ApproveUseCase.ApprovalCommand(
            id, "reviewer-789", "Approved", "idem-key-1"
        );

        ApproveUseCase.ApprovalResult result = service.approve(command);

        assertEquals(id, result.approvalRequestId());
        assertEquals("APPROVED", result.status());
        assertTrue(result.wasIdempotent());
        verify(approvalRepository, never()).findById(any());
        verify(approvalRepository, never()).save(any());
    }

    @Test
    void shouldThrowWhenApprovalRequestNotFound() {
        UUID id = UUID.randomUUID();
        when(approvalRepository.findById(id)).thenReturn(Optional.empty());
        when(idempotencyRepository.findResult("idem-key-1")).thenReturn(Optional.empty());

        ApproveUseCase.ApprovalCommand command = new ApproveUseCase.ApprovalCommand(
            id, "reviewer-789", "Approved", "idem-key-1"
        );

        assertThrows(ApprovalNotFoundException.class, () -> service.approve(command));
    }

    @Test
    void shouldRejectExistingPendingRequest() {
        UUID id = UUID.randomUUID();
        ApprovalRequest request = new ApprovalRequest(id, "user-123", "resource-456");
        when(approvalRepository.findById(id)).thenReturn(Optional.of(request));
        when(idempotencyRepository.findResult("idem-key-2")).thenReturn(Optional.empty());
        when(approvalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RejectUseCase.RejectionCommand command = new RejectUseCase.RejectionCommand(
            id, "reviewer-789", "Not compliant", "idem-key-2"
        );

        RejectUseCase.RejectionResult result = service.reject(command);

        assertEquals(id, result.approvalRequestId());
        assertEquals("REJECTED", result.status());
        assertFalse(result.wasIdempotent());
        verify(approvalRepository).save(any(ApprovalRequest.class));
        verify(idempotencyRepository).recordOperation("idem-key-2", "REJECTED");
    }

    @Test
    void shouldReturnCachedResultForDuplicateRejectionRequest() {
        UUID id = UUID.randomUUID();
        when(idempotencyRepository.findResult("idem-key-2")).thenReturn(Optional.of("REJECTED"));

        RejectUseCase.RejectionCommand command = new RejectUseCase.RejectionCommand(
            id, "reviewer-789", "Not compliant", "idem-key-2"
        );

        RejectUseCase.RejectionResult result = service.reject(command);

        assertEquals(id, result.approvalRequestId());
        assertEquals("REJECTED", result.status());
        assertTrue(result.wasIdempotent());
        verify(approvalRepository, never()).findById(any());
        verify(approvalRepository, never()).save(any());
    }

    @Test
    void shouldThrowWhenRejectingApprovedRequest() {
        UUID id = UUID.randomUUID();
        ApprovalRequest request = new ApprovalRequest(id, "user-123", "resource-456");
        request.approve("reviewer-111", "Already approved");
        when(approvalRepository.findById(id)).thenReturn(Optional.of(request));
        when(idempotencyRepository.findResult("idem-key-3")).thenReturn(Optional.empty());

        RejectUseCase.RejectionCommand command = new RejectUseCase.RejectionCommand(
            id, "reviewer-789", "Changed my mind", "idem-key-3"
        );

        assertThrows(InvalidStateTransitionException.class, () -> service.reject(command));
    }

    @Test
    void shouldThrowWhenApprovingRejectedRequest() {
        UUID id = UUID.randomUUID();
        ApprovalRequest request = new ApprovalRequest(id, "user-123", "resource-456");
        request.reject("reviewer-111", "Already rejected");
        when(approvalRepository.findById(id)).thenReturn(Optional.of(request));
        when(idempotencyRepository.findResult("idem-key-4")).thenReturn(Optional.empty());

        ApproveUseCase.ApprovalCommand command = new ApproveUseCase.ApprovalCommand(
            id, "reviewer-789", "Actually fine", "idem-key-4"
        );

        assertThrows(InvalidStateTransitionException.class, () -> service.approve(command));
    }
}
