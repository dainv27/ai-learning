package com.phase0demo.approve.application;

import com.phase0demo.approve.domain.ApprovalRequest;
import com.phase0demo.approve.domain.ApprovalStatus;
import com.phase0demo.approve.domain.InvalidStateTransitionException;
import com.phase0demo.approve.infrastructure.persistence.ApprovalRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Approval Service - State Machine Validation")
public class ApprovalServiceStateMachineTest {

    @Mock
    private ApprovalRequestRepository repository;

    @Mock
    private IdempotencyService idempotencyService;

    private ApprovalService approvalService;

    @BeforeEach
    void setUp() {
        approvalService = new ApprovalService(repository, idempotencyService);
    }

    @Test
    @DisplayName("Valid transition: PENDING -> APPROVED")
    void testValidTransition_PendingToApproved() {
        ApprovalRequest request = createRequest(ApprovalStatus.PENDING);
        when(repository.findById(request.getId())).thenReturn(Optional.of(request));
        when(repository.save(any(ApprovalRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(idempotencyService.checkOrStore(any(), any(), any())).thenReturn(Optional.empty());

        ApprovalRequest result = approvalService.approve(
            request.getId(),
            "approver-001",
            "Approved",
            UUID.randomUUID().toString()
        );

        assertEquals(ApprovalStatus.APPROVED, result.getStatus());
        assertEquals("approver-001", result.getApproverId());
        assertNotNull(result.getApprovedAt());
    }

    @Test
    @DisplayName("Valid transition: PENDING -> REJECTED")
    void testValidTransition_PendingToRejected() {
        ApprovalRequest request = createRequest(ApprovalStatus.PENDING);
        when(repository.findById(request.getId())).thenReturn(Optional.of(request));
        when(repository.save(any(ApprovalRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(idempotencyService.checkOrStore(any(), any(), any())).thenReturn(Optional.empty());

        ApprovalRequest result = approvalService.reject(
            request.getId(),
            "approver-002",
            "Rejected",
            UUID.randomUUID().toString()
        );

        assertEquals(ApprovalStatus.REJECTED, result.getStatus());
        assertEquals("approver-002", result.getApproverId());
        assertNotNull(result.getRejectedAt());
    }

    @Test
    @DisplayName("Invalid transition: APPROVED -> APPROVED throws exception")
    void testInvalidTransition_ApprovedToApproved() {
        ApprovalRequest request = createRequest(ApprovalStatus.APPROVED);
        request.setApproverId("original-approver");
        request.setApprovedAt(Instant.now());
        when(repository.findById(request.getId())).thenReturn(Optional.of(request));
        when(idempotencyService.checkOrStore(any(), any(), any())).thenReturn(Optional.empty());

        InvalidStateTransitionException exception = assertThrows(
            InvalidStateTransitionException.class,
            () -> approvalService.approve(
                request.getId(),
                "approver-003",
                "Trying again",
                UUID.randomUUID().toString()
            )
        );

        assertTrue(exception.getMessage().contains("already approved"));
    }

    @Test
    @DisplayName("Invalid transition: REJECTED -> REJECTED throws exception")
    void testInvalidTransition_RejectedToRejected() {
        ApprovalRequest request = createRequest(ApprovalStatus.REJECTED);
        request.setApproverId("original-approver");
        request.setRejectedAt(Instant.now());
        when(repository.findById(request.getId())).thenReturn(Optional.of(request));
        when(idempotencyService.checkOrStore(any(), any(), any())).thenReturn(Optional.empty());

        InvalidStateTransitionException exception = assertThrows(
            InvalidStateTransitionException.class,
            () -> approvalService.reject(
                request.getId(),
                "approver-004",
                "Trying again",
                UUID.randomUUID().toString()
            )
        );

        assertTrue(exception.getMessage().contains("already rejected"));
    }

    @Test
    @DisplayName("Invalid transition: APPROVED -> REJECTED throws exception")
    void testInvalidTransition_ApprovedToRejected() {
        ApprovalRequest request = createRequest(ApprovalStatus.APPROVED);
        request.setApproverId("original-approver");
        request.setApprovedAt(Instant.now());
        when(repository.findById(request.getId())).thenReturn(Optional.of(request));
        when(idempotencyService.checkOrStore(any(), any(), any())).thenReturn(Optional.empty());

        InvalidStateTransitionException exception = assertThrows(
            InvalidStateTransitionException.class,
            () -> approvalService.reject(
                request.getId(),
                "approver-005",
                "Changing mind",
                UUID.randomUUID().toString()
            )
        );

        assertTrue(exception.getMessage().contains("approved"));
    }

    @Test
    @DisplayName("Invalid transition: REJECTED -> APPROVED throws exception")
    void testInvalidTransition_RejectedToApproved() {
        ApprovalRequest request = createRequest(ApprovalStatus.REJECTED);
        request.setApproverId("original-approver");
        request.setRejectedAt(Instant.now());
        when(repository.findById(request.getId())).thenReturn(Optional.of(request));
        when(idempotencyService.checkOrStore(any(), any(), any())).thenReturn(Optional.empty());

        InvalidStateTransitionException exception = assertThrows(
            InvalidStateTransitionException.class,
            () -> approvalService.approve(
                request.getId(),
                "approver-006",
                "Reconsidering",
                UUID.randomUUID().toString()
            )
        );

        assertTrue(exception.getMessage().contains("rejected"));
    }

    @Test
    @DisplayName("Idempotency: duplicate request returns cached result")
    void testIdempotency_DuplicateRequestReturnsCached() {
        ApprovalRequest request = createRequest(ApprovalStatus.PENDING);
        ApprovalRequest cachedResult = createRequest(ApprovalStatus.APPROVED);
        cachedResult.setApproverId("approver-007");
        cachedResult.setApprovedAt(Instant.now());

        String idempotencyKey = UUID.randomUUID().toString();
        when(repository.findById(request.getId())).thenReturn(Optional.of(request));
        when(idempotencyService.checkOrStore(request.getId(), idempotencyKey, any()))
            .thenReturn(Optional.of(cachedResult));

        ApprovalRequest result = approvalService.approve(
            request.getId(),
            "approver-007",
            "Duplicate request",
            idempotencyKey
        );

        assertEquals(cachedResult, result);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("State preservation: approved timestamp is immutable")
    void testStatePreservation_ApprovedTimestampImmutable() {
        ApprovalRequest request = createRequest(ApprovalStatus.APPROVED);
        Instant originalTimestamp = Instant.now().minusSeconds(3600);
        request.setApproverId("approver-008");
        request.setApprovedAt(originalTimestamp);
        when(repository.findById(request.getId())).thenReturn(Optional.of(request));
        when(idempotencyService.checkOrStore(any(), any(), any())).thenReturn(Optional.empty());

        assertThrows(
            InvalidStateTransitionException.class,
            () -> approvalService.approve(
                request.getId(),
                "approver-009",
                "Trying to change",
                UUID.randomUUID().toString()
            )
        );

        // Timestamp should remain unchanged
        assertEquals(originalTimestamp, request.getApprovedAt());
    }

    private ApprovalRequest createRequest(ApprovalStatus status) {
        ApprovalRequest request = new ApprovalRequest();
        request.setId(UUID.randomUUID().toString());
        request.setRequesterId("requester-001");
        request.setResourceType("BUDGET_ALLOCATION");
        request.setResourceId("resource-001");
        request.setStatus(status);
        request.setCreatedAt(Instant.now());
        return request;
    }
}
