package com.phase0demo.approve.application;

import com.phase0demo.approve.application.port.ApprovalRepository;
import com.phase0demo.approve.domain.Approval;
import com.phase0demo.approve.domain.ApprovalStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ApprovalServiceTest {
    private ApprovalRepository repository;
    private IdempotencyService idempotencyService;
    private ApprovalService service;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(ApprovalRepository.class);
        idempotencyService = Mockito.mock(IdempotencyService.class);
        service = new ApprovalService(repository, idempotencyService);
    }

    @Test
    void approve_withIdempotencyKey_firstCall_savesAndReturns() {
        UUID approvalId = UUID.randomUUID();
        Approval pending = new Approval(approvalId, "requester1", ApprovalStatus.PENDING, null, null, Instant.now(), Instant.now());
        Approval approved = new Approval(approvalId, "requester1", ApprovalStatus.APPROVED, "Good", "approver1", Instant.now(), Instant.now());
        
        when(idempotencyService.checkIdempotency("key1")).thenReturn(null);
        when(repository.findById(approvalId)).thenReturn(Optional.of(pending));
        when(repository.save(any(Approval.class))).thenReturn(approved);

        Approval result = service.approve(approvalId, "approver1", "Good", "key1");

        assertEquals(ApprovalStatus.APPROVED, result.getStatus());
        verify(idempotencyService).storeIdempotency("key1", approved);
        verify(repository).save(any(Approval.class));
    }

    @Test
    void approve_withIdempotencyKey_duplicateCall_returnsCached() {
        UUID approvalId = UUID.randomUUID();
        Approval cached = new Approval(approvalId, "requester1", ApprovalStatus.APPROVED, "Good", "approver1", Instant.now(), Instant.now());
        
        when(idempotencyService.checkIdempotency("key1")).thenReturn(cached);

        Approval result = service.approve(approvalId, "approver1", "Good", "key1");

        assertEquals(cached, result);
        verify(repository, never()).findById(any());
        verify(repository, never()).save(any());
    }

    @Test
    void approve_alreadyApproved_throwsIllegalStateException() {
        UUID approvalId = UUID.randomUUID();
        Approval alreadyApproved = new Approval(approvalId, "requester1", ApprovalStatus.APPROVED, "Old comment", "approver0", Instant.now(), Instant.now());
        
        when(idempotencyService.checkIdempotency("key2")).thenReturn(null);
        when(repository.findById(approvalId)).thenReturn(Optional.of(alreadyApproved));

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            service.approve(approvalId, "approver1", "Try again", "key2");
        });

        assertTrue(exception.getMessage().contains("Cannot approve: approval is already APPROVED"));
        verify(repository, never()).save(any());
    }

    @Test
    void reject_withIdempotencyKey_firstCall_savesAndReturns() {
        UUID approvalId = UUID.randomUUID();
        Approval pending = new Approval(approvalId, "requester1", ApprovalStatus.PENDING, null, null, Instant.now(), Instant.now());
        Approval rejected = new Approval(approvalId, "requester1", ApprovalStatus.REJECTED, "Bad", "approver1", Instant.now(), Instant.now());
        
        when(idempotencyService.checkIdempotency("key3")).thenReturn(null);
        when(repository.findById(approvalId)).thenReturn(Optional.of(pending));
        when(repository.save(any(Approval.class))).thenReturn(rejected);

        Approval result = service.reject(approvalId, "approver1", "Bad", "key3");

        assertEquals(ApprovalStatus.REJECTED, result.getStatus());
        verify(idempotencyService).storeIdempotency("key3", rejected);
        verify(repository).save(any(Approval.class));
    }

    @Test
    void reject_alreadyRejected_throwsIllegalStateException() {
        UUID approvalId = UUID.randomUUID();
        Approval alreadyRejected = new Approval(approvalId, "requester1", ApprovalStatus.REJECTED, "Old reason", "approver0", Instant.now(), Instant.now());
        
        when(idempotencyService.checkIdempotency("key4")).thenReturn(null);
        when(repository.findById(approvalId)).thenReturn(Optional.of(alreadyRejected));

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            service.reject(approvalId, "approver1", "Try again", "key4");
        });

        assertTrue(exception.getMessage().contains("Cannot reject: approval is already REJECTED"));
        verify(repository, never()).save(any());
    }

    @Test
    void getApproval_exists_returnsApproval() {
        UUID approvalId = UUID.randomUUID();
        Approval approval = new Approval(approvalId, "requester1", ApprovalStatus.PENDING, null, null, Instant.now(), Instant.now());
        
        when(repository.findById(approvalId)).thenReturn(Optional.of(approval));

        Approval result = service.getApproval(approvalId);

        assertEquals(approval, result);
    }

    @Test
    void getApproval_notFound_throwsIllegalArgumentException() {
        UUID approvalId = UUID.randomUUID();
        
        when(repository.findById(approvalId)).thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            service.getApproval(approvalId);
        });

        assertTrue(exception.getMessage().contains("Approval not found"));
    }
}
