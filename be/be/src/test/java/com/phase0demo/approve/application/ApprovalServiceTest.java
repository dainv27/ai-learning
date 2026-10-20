package com.phase0demo.approve.application;

import com.phase0demo.approve.domain.Approval;
import com.phase0demo.approve.domain.ApprovalStatus;
import com.phase0demo.approve.repository.ApprovalRepository;
import com.phase0demo.approve.repository.IdempotencyKeyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApprovalServiceTest {

    @Mock
    private ApprovalRepository approvalRepository;

    @Mock
    private IdempotencyKeyRepository idempotencyKeyRepository;

    private ApprovalService approvalService;

    @BeforeEach
    void setUp() {
        approvalService = new ApprovalService(approvalRepository, idempotencyKeyRepository);
    }

    @Test
    void createApproval_success() {
        Approval approval = new Approval("document", "doc-123", "user-1", "Need approval");
        when(approvalRepository.save(any(Approval.class))).thenReturn(approval);

        Approval result = approvalService.createApproval("document", "doc-123", "user-1", "Need approval");

        assertNotNull(result);
        assertEquals("document", result.getResourceType());
        assertEquals("doc-123", result.getResourceId());
        assertEquals(ApprovalStatus.PENDING, result.getStatus());
        verify(approvalRepository).save(any(Approval.class));
    }

    @Test
    void createApproval_missingResourceType_throwsException() {
        assertThrows(IllegalArgumentException.class, () ->
            approvalService.createApproval(null, "doc-123", "user-1", "reason")
        );
    }

    @Test
    void createApproval_missingResourceId_throwsException() {
        assertThrows(IllegalArgumentException.class, () ->
            approvalService.createApproval("document", null, "user-1", "reason")
        );
    }

    @Test
    void createApproval_missingRequesterId_throwsException() {
        assertThrows(IllegalArgumentException.class, () ->
            approvalService.createApproval("document", "doc-123", null, "reason")
        );
    }

    @Test
    void approveWithIdempotency_success() {
        UUID id = UUID.randomUUID();
        Approval approval = new Approval("document", "doc-123", "user-1", "reason");
        when(approvalRepository.findByIdForUpdate(id)).thenReturn(Optional.of(approval));
        when(approvalRepository.save(any(Approval.class))).thenReturn(approval);
        when(idempotencyKeyRepository.findByKey(anyString())).thenReturn(Optional.empty());

        Approval result = approvalService.approveWithIdempotency(id, "approver-1", "idempotency-key-1");

        assertNotNull(result);
        assertEquals(ApprovalStatus.APPROVED, result.getStatus());
        assertEquals("approver-1", result.getApproverId());
        verify(idempotencyKeyRepository).save(any());
    }

    @Test
    void approveWithIdempotency_notFound_throwsException() {
        UUID id = UUID.randomUUID();
        when(approvalRepository.findByIdForUpdate(id)).thenReturn(Optional.empty());

        assertThrows(ApprovalNotFoundException.class, () ->
            approvalService.approveWithIdempotency(id, "approver-1", null)
        );
    }

    @Test
    void approveWithIdempotency_alreadyApproved_throwsStateException() {
        UUID id = UUID.randomUUID();
        Approval approval = new Approval("document", "doc-123", "user-1", "reason");
        approval.approve("approver-1");
        when(approvalRepository.findByIdForUpdate(id)).thenReturn(Optional.of(approval));

        assertThrows(ApprovalStateException.class, () ->
            approvalService.approveWithIdempotency(id, "approver-2", null)
        );
    }

    @Test
    void rejectWithIdempotency_success() {
        UUID id = UUID.randomUUID();
        Approval approval = new Approval("document", "doc-123", "user-1", "reason");
        when(approvalRepository.findByIdForUpdate(id)).thenReturn(Optional.of(approval));
        when(approvalRepository.save(any(Approval.class))).thenReturn(approval);
        when(idempotencyKeyRepository.findByKey(anyString())).thenReturn(Optional.empty());

        Approval result = approvalService.rejectWithIdempotency(id, "approver-1", "Not valid", "idempotency-key-2");

        assertNotNull(result);
        assertEquals(ApprovalStatus.REJECTED, result.getStatus());
        assertEquals("approver-1", result.getApproverId());
        assertEquals("Not valid", result.getReason());
        verify(idempotencyKeyRepository).save(any());
    }
}
