package com.phase0demo.approve.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.phase0demo.approve.application.ApprovalService;
import com.phase0demo.approve.domain.ApprovalRequest;
import com.phase0demo.approve.domain.ApprovalStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ApprovalController.class)
@DisplayName("Approval Controller - API Contract Validation")
public class ApprovalControllerContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ApprovalService approvalService;

    @Test
    @WithMockUser(username = "test-approver")
    @DisplayName("Approve API contract - request body contains only comment field")
    void testApproveContract_RequestBodyOnlyComment() throws Exception {
        ApprovalRequest mockResult = createMockApprovalRequest(ApprovalStatus.APPROVED);
        mockResult.setApproverId("test-approver");
        mockResult.setApprovedAt(Instant.now());
        mockResult.setComment("Test comment");

        when(approvalService.approve(
            eq(mockResult.getId()),
            eq("test-approver"),
            eq("Test comment"),
            any(String.class)
        )).thenReturn(mockResult);

        String requestBody = "{\"comment\":\"Test comment\"}";

        mockMvc.perform(post("/api/approvals/{id}/approve", mockResult.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.approverId").value("test-approver"))
            .andExpect(jsonPath("$.comment").value("Test comment"));
    }

    @Test
    @WithMockUser(username = "test-approver")
    @DisplayName("Approve API contract - approverId in request body is ignored")
    void testApproveContract_ApproverIdInBodyIgnored() throws Exception {
        ApprovalRequest mockResult = createMockApprovalRequest(ApprovalStatus.APPROVED);
        mockResult.setApproverId("test-approver");
        mockResult.setApprovedAt(Instant.now());
        mockResult.setComment("Test comment");

        when(approvalService.approve(
            eq(mockResult.getId()),
            eq("test-approver"),
            eq("Test comment"),
            any(String.class)
        )).thenReturn(mockResult);

        // Request body includes approverId, which should be ignored
        String requestBody = "{\"approverId\":\"hacker-id\",\"comment\":\"Test comment\"}";

        mockMvc.perform(post("/api/approvals/{id}/approve", mockResult.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.approverId").value("test-approver"))
            .andExpect(jsonPath("$.approverId").value(org.hamcrest.Matchers.not("hacker-id")));
    }

    @Test
    @WithMockUser(username = "test-approver")
    @DisplayName("Reject API contract - request body contains only comment field")
    void testRejectContract_RequestBodyOnlyComment() throws Exception {
        ApprovalRequest mockResult = createMockApprovalRequest(ApprovalStatus.REJECTED);
        mockResult.setApproverId("test-approver");
        mockResult.setRejectedAt(Instant.now());
        mockResult.setComment("Rejection reason");

        when(approvalService.reject(
            eq(mockResult.getId()),
            eq("test-approver"),
            eq("Rejection reason"),
            any(String.class)
        )).thenReturn(mockResult);

        String requestBody = "{\"comment\":\"Rejection reason\"}";

        mockMvc.perform(post("/api/approvals/{id}/reject", mockResult.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("REJECTED"))
            .andExpect(jsonPath("$.approverId").value("test-approver"))
            .andExpect(jsonPath("$.comment").value("Rejection reason"));
    }

    @Test
    @WithMockUser(username = "test-approver")
    @DisplayName("Response contract - all required fields present in success response")
    void testResponseContract_AllRequiredFieldsPresent() throws Exception {
        ApprovalRequest mockResult = createMockApprovalRequest(ApprovalStatus.APPROVED);
        mockResult.setApproverId("test-approver");
        mockResult.setApprovedAt(Instant.now());
        mockResult.setComment("Approved");

        when(approvalService.approve(
            eq(mockResult.getId()),
            eq("test-approver"),
            eq("Approved"),
            any(String.class)
        )).thenReturn(mockResult);

        String requestBody = "{\"comment\":\"Approved\"}";

        mockMvc.perform(post("/api/approvals/{id}/approve", mockResult.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(mockResult.getId()))
            .andExpect(jsonPath("$.requesterId").value(mockResult.getRequesterId()))
            .andExpect(jsonPath("$.resourceType").value(mockResult.getResourceType()))
            .andExpect(jsonPath("$.resourceId").value(mockResult.getResourceId()))
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.approverId").value("test-approver"))
            .andExpect(jsonPath("$.approvedAt").exists())
            .andExpect(jsonPath("$.comment").value("Approved"))
            .andExpect(jsonPath("$.createdAt").exists());
    }

    @Test
    @WithMockUser(username = "test-approver")
    @DisplayName("Error response contract - RFC 7807 structure on validation error")
    void testErrorContract_RFC7807Structure() throws Exception {
        mockMvc.perform(post("/api/approvals/{id}/approve", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\":\"Test\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(jsonPath("$.error.code").exists())
            .andExpect(jsonPath("$.error.message").exists());
    }

    @Test
    @WithMockUser(username = "test-approver")
    @DisplayName("Content-Type validation - rejects non-JSON content type")
    void testContentTypeValidation_RejectsNonJSON() throws Exception {
        mockMvc.perform(post("/api/approvals/{id}/approve", UUID.randomUUID().toString())
                .contentType(MediaType.TEXT_PLAIN)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content("comment=Test"))
            .andExpect(status().isUnsupportedMediaType());
    }

    private ApprovalRequest createMockApprovalRequest(ApprovalStatus status) {
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
