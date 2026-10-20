package com.phase0demo.approve.adapter.web;

import com.phase0demo.approve.application.ApprovalService;
import com.phase0demo.approve.domain.Approval;
import com.phase0demo.approve.domain.ApprovalStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ApprovalController.class)
class ApprovalControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ApprovalService approvalService;

    @Test
    @WithMockUser(username = "approver1")
    void approve_validRequest_returns200() throws Exception {
        UUID approvalId = UUID.randomUUID();
        Approval approved = new Approval(approvalId, "requester1", ApprovalStatus.APPROVED, "Good", "approver1", Instant.now(), Instant.now());
        
        when(approvalService.approve(eq(approvalId), eq("approver1"), eq("Good"), anyString())).thenReturn(approved);

        mockMvc.perform(post("/api/approvals/" + approvalId + "/approve")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\":\"Good\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.approverId").value("approver1"));
    }

    @Test
    void approve_noAuthentication_returns401() throws Exception {
        UUID approvalId = UUID.randomUUID();

        mockMvc.perform(post("/api/approvals/" + approvalId + "/approve")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\":\"Good\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    @WithMockUser(username = "approver1")
    void approve_alreadyApproved_returns409() throws Exception {
        UUID approvalId = UUID.randomUUID();
        
        when(approvalService.approve(eq(approvalId), eq("approver1"), anyString(), anyString()))
            .thenThrow(new IllegalStateException("Cannot approve: approval is already APPROVED"));

        mockMvc.perform(post("/api/approvals/" + approvalId + "/approve")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\":\"Good\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code").value("INVALID_STATE_TRANSITION"));
    }

    @Test
    @WithMockUser(username = "approver1")
    void approve_notFound_returns404() throws Exception {
        UUID approvalId = UUID.randomUUID();
        
        when(approvalService.approve(eq(approvalId), eq("approver1"), anyString(), anyString()))
            .thenThrow(new IllegalArgumentException("Approval not found: " + approvalId));

        mockMvc.perform(post("/api/approvals/" + approvalId + "/approve")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\":\"Good\"}"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    @WithMockUser(username = "approver1")
    void reject_validRequest_returns200() throws Exception {
        UUID approvalId = UUID.randomUUID();
        Approval rejected = new Approval(approvalId, "requester1", ApprovalStatus.REJECTED, "Bad", "approver1", Instant.now(), Instant.now());
        
        when(approvalService.reject(eq(approvalId), eq("approver1"), eq("Bad"), anyString())).thenReturn(rejected);

        mockMvc.perform(post("/api/approvals/" + approvalId + "/reject")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\":\"Bad\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("REJECTED"))
            .andExpect(jsonPath("$.approverId").value("approver1"));
    }

    @Test
    @WithMockUser(username = "approver1")
    void reject_alreadyRejected_returns409() throws Exception {
        UUID approvalId = UUID.randomUUID();
        
        when(approvalService.reject(eq(approvalId), eq("approver1"), anyString(), anyString()))
            .thenThrow(new IllegalStateException("Cannot reject: approval is already REJECTED"));

        mockMvc.perform(post("/api/approvals/" + approvalId + "/reject")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\":\"Bad\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code").value("INVALID_STATE_TRANSITION"));
    }

    @Test
    @WithMockUser(username = "user1")
    void get_validRequest_returns200() throws Exception {
        UUID approvalId = UUID.randomUUID();
        Approval approval = new Approval(approvalId, "requester1", ApprovalStatus.PENDING, null, null, Instant.now(), Instant.now());
        
        when(approvalService.getApproval(approvalId)).thenReturn(approval);

        mockMvc.perform(get("/api/approvals/" + approvalId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(approvalId.toString()))
            .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @WithMockUser(username = "user1")
    void get_notFound_returns404() throws Exception {
        UUID approvalId = UUID.randomUUID();
        
        when(approvalService.getApproval(approvalId))
            .thenThrow(new IllegalArgumentException("Approval not found: " + approvalId));

        mockMvc.perform(get("/api/approvals/" + approvalId))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }
}
