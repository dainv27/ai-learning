package com.phase0demo.approve.adapter.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.phase0demo.approve.application.ApprovalNotFoundException;
import com.phase0demo.approve.application.ApprovalService;
import com.phase0demo.approve.application.ApprovalStateException;
import com.phase0demo.approve.domain.Approval;
import com.phase0demo.approve.domain.ApprovalStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ApprovalController.class)
class ApprovalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ApprovalService approvalService;

    @Test
    @WithMockUser(username = "user1", roles = {"USER"})
    void createApproval_success() throws Exception {
        CreateApprovalRequest request = new CreateApprovalRequest("document", "doc-123", "Need approval");
        Approval approval = new Approval("document", "doc-123", "user1", "Need approval");
        when(approvalService.createApproval(anyString(), anyString(), anyString(), anyString())).thenReturn(approval);

        mockMvc.perform(post("/api/approvals")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.resourceType").value("document"))
            .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @WithMockUser(username = "user1", roles = {"USER"})
    void getApproval_found() throws Exception {
        UUID id = UUID.randomUUID();
        Approval approval = new Approval("document", "doc-123", "user1", "reason");
        when(approvalService.getApproval(id)).thenReturn(Optional.of(approval));

        mockMvc.perform(get("/api/approvals/{id}", id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.resourceType").value("document"));
    }

    @Test
    @WithMockUser(username = "user1", roles = {"USER"})
    void getApproval_notFound() throws Exception {
        UUID id = UUID.randomUUID();
        when(approvalService.getApproval(id)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/approvals/{id}", id))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("APPROVAL_NOT_FOUND"));
    }

    @Test
    @WithMockUser(username = "user1", roles = {"USER"})
    void listApprovals_success() throws Exception {
        Approval approval = new Approval("document", "doc-123", "user1", "reason");
        when(approvalService.listApprovals(null, null)).thenReturn(List.of(approval));

        mockMvc.perform(get("/api/approvals"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].resourceType").value("document"));
    }

    @Test
    @WithMockUser(username = "approver1", roles = {"APPROVER"})
    void approveApproval_success() throws Exception {
        UUID id = UUID.randomUUID();
        Approval approval = new Approval("document", "doc-123", "user1", "reason");
        approval.approve("approver1");
        when(approvalService.approveWithIdempotency(any(UUID.class), anyString(), anyString())).thenReturn(approval);

        mockMvc.perform(post("/api/approvals/{id}/approve", id)
                .with(csrf())
                .header("Idempotency-Key", "key-123"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @WithMockUser(username = "user1", roles = {"USER"})
    void approveApproval_unauthorized() throws Exception {
        UUID id = UUID.randomUUID();

        mockMvc.perform(post("/api/approvals/{id}/approve", id)
                .with(csrf()))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    @WithMockUser(username = "approver1", roles = {"APPROVER"})
    void approveApproval_conflict() throws Exception {
        UUID id = UUID.randomUUID();
        when(approvalService.approveWithIdempotency(any(UUID.class), anyString(), anyString()))
            .thenThrow(new ApprovalStateException("Only pending approvals can be approved"));

        mockMvc.perform(post("/api/approvals/{id}/approve", id)
                .with(csrf()))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code").value("CONFLICT"));
    }

    @Test
    @WithMockUser(username = "approver1", roles = {"APPROVER"})
    void rejectApproval_success() throws Exception {
        UUID id = UUID.randomUUID();
        Approval approval = new Approval("document", "doc-123", "user1", "reason");
        approval.reject("approver1", "Not valid");
        when(approvalService.rejectWithIdempotency(any(UUID.class), anyString(), anyString(), anyString())).thenReturn(approval);

        RejectApprovalRequest request = new RejectApprovalRequest("Not valid");
        mockMvc.perform(post("/api/approvals/{id}/reject", id)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("REJECTED"));
    }
}
