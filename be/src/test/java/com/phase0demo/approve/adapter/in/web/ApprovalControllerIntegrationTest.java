package com.phase0demo.approve.adapter.in.web;

import com.phase0demo.approve.application.port.out.AuthorizationPort;
import com.phase0demo.approve.domain.Approval;
import com.phase0demo.approve.domain.ApprovalRepository;
import com.phase0demo.approve.domain.ApprovalStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ApprovalControllerIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ApprovalRepository repository;

    @MockBean
    private AuthorizationPort authorizationPort;

    private UUID approvalId;
    private Approval pendingApproval;

    @BeforeEach
    void setUp() {
        approvalId = UUID.randomUUID();
        Instant now = Instant.now();
        pendingApproval = new Approval(
            approvalId,
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

    @Test
    @WithMockUser(username = "user-1")
    void approveEndpointSucceeds() throws Exception {
        when(repository.existsByIdempotencyKey("test-key-1")).thenReturn(false);
        when(repository.findByIdWithLock(approvalId)).thenReturn(Optional.of(pendingApproval));
        when(authorizationPort.canApprove("user-1", "resource-123", "document")).thenReturn(true);
        when(repository.save(any(Approval.class))).thenAnswer(i -> i.getArgument(0));

        mockMvc.perform(post("/api/approvals/{id}/approve", approvalId)
                .header("Idempotency-Key", "test-key-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\":\"Looks good\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(approvalId.toString()))
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.approverId").value("user-1"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void approveFailsWithoutIdempotencyKey() throws Exception {
        mockMvc.perform(post("/api/approvals/{id}/approve", approvalId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\":\"Looks good\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("MISSING_IDEMPOTENCY_KEY"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void approveFailsWhenUnauthorized() throws Exception {
        when(repository.existsByIdempotencyKey("test-key-2")).thenReturn(false);
        when(repository.findByIdWithLock(approvalId)).thenReturn(Optional.of(pendingApproval));
        when(authorizationPort.canApprove("user-1", "resource-123", "document")).thenReturn(false);

        mockMvc.perform(post("/api/approvals/{id}/approve", approvalId)
                .header("Idempotency-Key", "test-key-2")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\":\"Looks good\"}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void approveFailsWhenNotFound() throws Exception {
        when(repository.existsByIdempotencyKey("test-key-3")).thenReturn(false);
        when(repository.findByIdWithLock(approvalId)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/approvals/{id}/approve", approvalId)
                .header("Idempotency-Key", "test-key-3")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\":\"Looks good\"}"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("APPROVAL_NOT_FOUND"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void rejectEndpointSucceeds() throws Exception {
        when(repository.existsByIdempotencyKey("test-key-4")).thenReturn(false);
        when(repository.findByIdWithLock(approvalId)).thenReturn(Optional.of(pendingApproval));
        when(authorizationPort.canApprove("user-1", "resource-123", "document")).thenReturn(true);
        when(repository.save(any(Approval.class))).thenAnswer(i -> i.getArgument(0));

        mockMvc.perform(post("/api/approvals/{id}/reject", approvalId)
                .header("Idempotency-Key", "test-key-4")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\":\"Needs work\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(approvalId.toString()))
            .andExpect(jsonPath("$.status").value("REJECTED"))
            .andExpect(jsonPath("$.approverId").value("user-1"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void getApprovalSucceeds() throws Exception {
        when(repository.findById(approvalId)).thenReturn(Optional.of(pendingApproval));

        mockMvc.perform(get("/api/approvals/{id}", approvalId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(approvalId.toString()))
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.resourceId").value("resource-123"));
    }
}