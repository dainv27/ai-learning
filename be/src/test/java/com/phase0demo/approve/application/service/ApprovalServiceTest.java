package com.phase0demo.approve.application.service;

import com.phase0demo.approve.application.port.in.ApproveCommand;
import com.phase0demo.approve.application.port.in.RejectCommand;
import com.phase0demo.approve.application.port.out.AuthorizationPort;
import com.phase0demo.approve.domain.Approval;
import com.phase0demo.approve.domain.ApprovalRepository;
import com.phase0demo.approve.domain.ApprovalStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ApprovalServiceTest {
    private ApprovalRepository repository;
    private AuthorizationPort authorizationPort;
    private Clock clock;
    private ApprovalService service;

    @BeforeEach
    void setUp() {
        repository = mock(ApprovalRepository.class);
        authorizationPort = mock(AuthorizationPort.class);
        clock = Clock.fixed(Instant.parse("2024-01-01T00:00:00Z"), ZoneId.of("UTC"));
        service = new ApprovalService(repository, authorizationPort, clock);
    }

    @Test
    void approveSuccessfullyWhenAuthorized() {
        UUID approvalId = UUID.randomUUID();
        Approval pending = createPendingApproval(approvalId);

        when(repository.existsByIdempotencyKey("key-1")).thenReturn(false);
        when(repository.findByIdWithLock(approvalId)).thenReturn(Optional.of(pending));
        when(authorizationPort.canApprove("user-1", "resource-123", "document")).thenReturn(true);
        when(repository.save(any(Approval.class))).thenAnswer(i -> i.getArgument(0));

        ApproveCommand command = new ApproveCommand(approvalId, "user-1", "Approved", "key-1");
        Approval result = service.approve(command);

        assertEquals(ApprovalStatus.APPROVED, result.getStatus());
        assertEquals("user-1", result.getApproverId());
        verify(repository).saveIdempotencyKey("key-1", approvalId);
    }

    @Test
    void approveFailsWhenUnauthorized() {
        UUID approvalId = UUID.randomUUID();
        Approval pending = createPendingApproval(approvalId);

        when(repository.existsByIdempotencyKey("key-1")).thenReturn(false);
        when(repository.findByIdWithLock(approvalId)).thenReturn(Optional.of(pending));
        when(authorizationPort.canApprove("user-1", "resource-123", "document")).thenReturn(false);

        ApproveCommand command = new ApproveCommand(approvalId, "user-1", "Approved", "key-1");

        assertThrows(ApprovalService.UnauthorizedException.class, () -> service.approve(command));
        verify(repository, never()).save(any());
    }

    @Test
    void approveReturnsExistingWhenIdempotent() {
        UUID approvalId = UUID.randomUUID();
        Approval approved = createApprovedApproval(approvalId);

        when(repository.existsByIdempotencyKey("key-1")).thenReturn(true);
        when(repository.findByIdempotencyKey("key-1")).thenReturn(Optional.of(approved));

        ApproveCommand command = new ApproveCommand(approvalId, "user-1", "Approved", "key-1");
        Approval result = service.approve(command);

        assertEquals(ApprovalStatus.APPROVED, result.getStatus());
        verify(repository, never()).findByIdWithLock(any());
        verify(repository, never()).save(any());
    }

    @Test
    void approveFailsWhenNotFound() {
        UUID approvalId = UUID.randomUUID();

        when(repository.existsByIdempotencyKey("key-1")).thenReturn(false);
        when(repository.findByIdWithLock(approvalId)).thenReturn(Optional.empty());

        ApproveCommand command = new ApproveCommand(approvalId, "user-1", "Approved", "key-1");

        assertThrows(ApprovalService.ApprovalNotFoundException.class, () -> service.approve(command));
    }

    @Test
    void approveFailsWhenAlreadyApproved() {
        UUID approvalId = UUID.randomUUID();
        Approval approved = createApprovedApproval(approvalId);

        when(repository.existsByIdempotencyKey("key-1")).thenReturn(false);
        when(repository.findByIdWithLock(approvalId)).thenReturn(Optional.of(approved));
        when(authorizationPort.canApprove("user-1", "resource-123", "document")).thenReturn(true);

        ApproveCommand command = new ApproveCommand(approvalId, "user-1", "Double", "key-1");

        assertThrows(IllegalStateException.class, () -> service.approve(command));
    }

    @Test
    void rejectSuccessfullyWhenAuthorized() {
        UUID approvalId = UUID.randomUUID();
        Approval pending = createPendingApproval(approvalId);

        when(repository.existsByIdempotencyKey("key-2")).thenReturn(false);
        when(repository.findByIdWithLock(approvalId)).thenReturn(Optional.of(pending));
        when(authorizationPort.canApprove("user-1", "resource-123", "document")).thenReturn(true);
        when(repository.save(any(Approval.class))).thenAnswer(i -> i.getArgument(0));

        RejectCommand command = new RejectCommand(approvalId, "user-1", "Needs work", "key-2");
        Approval result = service.reject(command);

        assertEquals(ApprovalStatus.REJECTED, result.getStatus());
        assertEquals("user-1", result.getApproverId());
        verify(repository).saveIdempotencyKey("key-2", approvalId);
    }

    @Test
    void rejectFailsWhenUnauthorized() {
        UUID approvalId = UUID.randomUUID();
        Approval pending = createPendingApproval(approvalId);

        when(repository.existsByIdempotencyKey("key-2")).thenReturn(false);
        when(repository.findByIdWithLock(approvalId)).thenReturn(Optional.of(pending));
        when(authorizationPort.canApprove("user-1", "resource-123", "document")).thenReturn(false);

        RejectCommand command = new RejectCommand(approvalId, "user-1", "Rejected", "key-2");

        assertThrows(ApprovalService.UnauthorizedException.class, () -> service.reject(command));
    }

    @Test
    void rejectReturnsExistingWhenIdempotent() {
        UUID approvalId = UUID.randomUUID();
        Approval rejected = createRejectedApproval(approvalId);

        when(repository.existsByIdempotencyKey("key-2")).thenReturn(true);
        when(repository.findByIdempotencyKey("key-2")).thenReturn(Optional.of(rejected));

        RejectCommand command = new RejectCommand(approvalId, "user-1", "Rejected", "key-2");
        Approval result = service.reject(command);

        assertEquals(ApprovalStatus.REJECTED, result.getStatus());
        verify(repository, never()).save(any());
    }

    private Approval createPendingApproval(UUID id) {
        Instant now = clock.instant();
        return new Approval(id, "resource-123", "document", "requester-1",
            ApprovalStatus.PENDING, null, null, now, now, 0);
    }

    private Approval createApprovedApproval(UUID id) {
        Instant now = clock.instant();
        return new Approval(id, "resource-123", "document", "requester-1",
            ApprovalStatus.APPROVED, "user-1", "Approved", now, now, 1);
    }

    private Approval createRejectedApproval(UUID id) {
        Instant now = clock.instant();
        return new Approval(id, "resource-123", "document", "requester-1",
            ApprovalStatus.REJECTED, "user-1", "Rejected", now, now, 1);
    }
}