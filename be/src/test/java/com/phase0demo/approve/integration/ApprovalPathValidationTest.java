package com.phase0demo.approve.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.phase0demo.approve.domain.ApprovalRequest;
import com.phase0demo.approve.domain.ApprovalStatus;
import com.phase0demo.approve.infrastructure.persistence.ApprovalRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("Approval Path Validation - Contract and State Machine")
public class ApprovalPathValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApprovalRequestRepository repository;

    @Autowired
    private ObjectMapper objectMapper;

    private ApprovalRequest pendingRequest;
    private ApprovalRequest approvedRequest;
    private ApprovalRequest rejectedRequest;

    @BeforeEach
    void setUp() {
        repository.deleteAll();

        // Create test fixtures in different states
        pendingRequest = new ApprovalRequest();
        pendingRequest.setId(UUID.randomUUID().toString());
        pendingRequest.setRequesterId("requester-001");
        pendingRequest.setResourceType("BUDGET_ALLOCATION");
        pendingRequest.setResourceId("budget-2024-q1");
        pendingRequest.setStatus(ApprovalStatus.PENDING);
        pendingRequest.setCreatedAt(Instant.now());
        repository.save(pendingRequest);

        approvedRequest = new ApprovalRequest();
        approvedRequest.setId(UUID.randomUUID().toString());
        approvedRequest.setRequesterId("requester-002");
        approvedRequest.setResourceType("BUDGET_ALLOCATION");
        approvedRequest.setResourceId("budget-2024-q2");
        approvedRequest.setStatus(ApprovalStatus.APPROVED);
        approvedRequest.setApproverId("approver-001");
        approvedRequest.setApprovedAt(Instant.now());
        approvedRequest.setCreatedAt(Instant.now().minusSeconds(3600));
        repository.save(approvedRequest);

        rejectedRequest = new ApprovalRequest();
        rejectedRequest.setId(UUID.randomUUID().toString());
        rejectedRequest.setRequesterId("requester-003");
        rejectedRequest.setResourceType("BUDGET_ALLOCATION");
        rejectedRequest.setResourceId("budget-2024-q3");
        rejectedRequest.setStatus(ApprovalStatus.REJECTED);
        rejectedRequest.setApproverId("approver-002");
        rejectedRequest.setRejectedAt(Instant.now());
        rejectedRequest.setComment("Insufficient justification");
        rejectedRequest.setCreatedAt(Instant.now().minusSeconds(7200));
        repository.save(rejectedRequest);
    }

    @Test
    @WithMockUser(username = "approver-100")
    @DisplayName("Approve endpoint - approverId extracted from authentication, not request body")
    void testApproveEndpoint_ApproverIdFromAuth() throws Exception {
        String requestBody = objectMapper.writeValueAsString(
            new ApprovalRequestBody("Looks good to me")
        );

        mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.approverId").value("approver-100"))
            .andExpect(jsonPath("$.comment").value("Looks good to me"))
            .andExpect(jsonPath("$.approvedAt").exists());
    }

    @Test
    @WithMockUser(username = "approver-101")
    @DisplayName("Reject endpoint - approverId extracted from authentication, not request body")
    void testRejectEndpoint_ApproverIdFromAuth() throws Exception {
        String requestBody = objectMapper.writeValueAsString(
            new ApprovalRequestBody("Does not meet requirements")
        );

        mockMvc.perform(post("/api/approvals/{id}/reject", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("REJECTED"))
            .andExpect(jsonPath("$.approverId").value("approver-101"))
            .andExpect(jsonPath("$.comment").value("Does not meet requirements"))
            .andExpect(jsonPath("$.rejectedAt").exists());
    }

    @Test
    @WithMockUser(username = "approver-102")
    @DisplayName("Idempotency - duplicate approve with same key returns same response")
    void testIdempotency_DuplicateApprove() throws Exception {
        String idempotencyKey = UUID.randomUUID().toString();
        String requestBody = objectMapper.writeValueAsString(
            new ApprovalRequestBody("First approval")
        );

        // First request
        String firstResponse = mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", idempotencyKey)
                .content(requestBody))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        // Second request with same idempotency key
        String secondResponse = mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", idempotencyKey)
                .content(requestBody))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        // Responses should be identical
        assert firstResponse.equals(secondResponse) : "Idempotent responses must be identical";
    }

    @Test
    @WithMockUser(username = "approver-103")
    @DisplayName("State machine - cannot approve already approved request")
    void testStateMachine_CannotApproveApproved() throws Exception {
        String requestBody = objectMapper.writeValueAsString(
            new ApprovalRequestBody("Trying to approve again")
        );

        mockMvc.perform(post("/api/approvals/{id}/approve", approvedRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(requestBody))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code").value("INVALID_STATE_TRANSITION"))
            .andExpect(jsonPath("$.error.message").value(containsString("already approved")));
    }

    @Test
    @WithMockUser(username = "approver-104")
    @DisplayName("State machine - cannot reject already rejected request")
    void testStateMachine_CannotRejectRejected() throws Exception {
        String requestBody = objectMapper.writeValueAsString(
            new ApprovalRequestBody("Trying to reject again")
        );

        mockMvc.perform(post("/api/approvals/{id}/reject", rejectedRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(requestBody))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code").value("INVALID_STATE_TRANSITION"))
            .andExpect(jsonPath("$.error.message").value(containsString("already rejected")));
    }

    @Test
    @WithMockUser(username = "approver-105")
    @DisplayName("State machine - cannot approve already rejected request")
    void testStateMachine_CannotApproveRejected() throws Exception {
        String requestBody = objectMapper.writeValueAsString(
            new ApprovalRequestBody("Trying to approve rejected")
        );

        mockMvc.perform(post("/api/approvals/{id}/approve", rejectedRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(requestBody))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code").value("INVALID_STATE_TRANSITION"))
            .andExpect(jsonPath("$.error.message").value(containsString("rejected")));
    }

    @Test
    @WithMockUser(username = "approver-106")
    @DisplayName("Input validation - missing Idempotency-Key returns 400")
    void testValidation_MissingIdempotencyKey() throws Exception {
        String requestBody = objectMapper.writeValueAsString(
            new ApprovalRequestBody("Comment without key")
        );

        mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("MISSING_IDEMPOTENCY_KEY"))
            .andExpect(jsonPath("$.error.message").exists());
    }

    @Test
    @WithMockUser(username = "approver-107")
    @DisplayName("Input validation - invalid request body returns 400")
    void testValidation_InvalidRequestBody() throws Exception {
        String invalidJson = "{invalid json}";

        mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(invalidJson))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").exists())
            .andExpect(jsonPath("$.error.message").exists());
    }

    @Test
    @WithMockUser(username = "approver-108")
    @DisplayName("Error response - non-existent approval returns 404")
    void testErrorResponse_NotFound() throws Exception {
        String requestBody = objectMapper.writeValueAsString(
            new ApprovalRequestBody("Approving non-existent")
        );

        mockMvc.perform(post("/api/approvals/{id}/approve", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(requestBody))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("APPROVAL_NOT_FOUND"))
            .andExpect(jsonPath("$.error.message").exists());
    }

    @Test
    @WithMockUser(username = "approver-109")
    @DisplayName("RFC 7807 compliance - error responses have correct structure")
    void testRFC7807_ErrorStructure() throws Exception {
        String requestBody = objectMapper.writeValueAsString(
            new ApprovalRequestBody("Testing error format")
        );

        mockMvc.perform(post("/api/approvals/{id}/approve", approvedRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(requestBody))
            .andExpect(status().isConflict())
            .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(jsonPath("$.error.code").exists())
            .andExpect(jsonPath("$.error.message").exists());
    }

    @Test
    @WithMockUser(username = "approver-110")
    @DisplayName("Comment field - approve with comment persists correctly")
    void testCommentField_ApproveWithComment() throws Exception {
        String comment = "Budget approved after review with finance team";
        String requestBody = objectMapper.writeValueAsString(
            new ApprovalRequestBody(comment)
        );

        mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.comment").value(comment));
    }

    @Test
    @WithMockUser(username = "approver-111")
    @DisplayName("Comment field - approve without comment is valid")
    void testCommentField_ApproveWithoutComment() throws Exception {
        String requestBody = objectMapper.writeValueAsString(
            new ApprovalRequestBody(null)
        );

        mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    // Request body class for API contract
    private static class ApprovalRequestBody {
        public String comment;

        public ApprovalRequestBody(String comment) {
            this.comment = comment;
        }
    }
}
