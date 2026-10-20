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
import java.util.HashMap;
import java.util.Map;
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
    @DisplayName("[TC-012] Backend integration test ignores approverId in request body")
    void testApproveEndpoint_IgnoresApproverIdInBody() throws Exception {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("approverId", "hacker-attempt-to-spoof");
        requestBody.put("comment", "Looks good to me");

        mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.approverId").value("approver-100"))
            .andExpect(jsonPath("$.approverId").value(not("hacker-attempt-to-spoof")))
            .andExpect(jsonPath("$.comment").value("Looks good to me"))
            .andExpect(jsonPath("$.approvedAt").exists());
    }

    @Test
    @WithMockUser(username = "approver-101")
    @DisplayName("Reject endpoint - approverId extracted from authentication, not request body")
    void testRejectEndpoint_ApproverIdFromAuth() throws Exception {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("comment", "Does not meet requirements");

        mockMvc.perform(post("/api/approvals/{id}/reject", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("REJECTED"))
            .andExpect(jsonPath("$.approverId").value("approver-101"))
            .andExpect(jsonPath("$.comment").value("Does not meet requirements"))
            .andExpect(jsonPath("$.rejectedAt").exists());
    }

    @Test
    @WithMockUser(username = "approver-102")
    @DisplayName("[TC-014] Backend integration test validates input - missing Idempotency-Key")
    void testValidateInput_MissingIdempotencyKey() throws Exception {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("comment", "Approved");

        mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.title").exists())
            .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @WithMockUser(username = "approver-103")
    @DisplayName("[TC-014] Backend integration test validates input - invalid approval ID")
    void testValidateInput_InvalidApprovalId() throws Exception {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("comment", "Approved");
        String nonExistentId = UUID.randomUUID().toString();

        mockMvc.perform(post("/api/approvals/{id}/approve", nonExistentId)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.title").exists())
            .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @WithMockUser(username = "approver-104")
    @DisplayName("[TC-014] Backend integration test validates input - malformed request body")
    void testValidateInput_MalformedRequestBody() throws Exception {
        String malformedJson = "{comment: 'missing quotes'}";

        mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(malformedJson))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "approver-105")
    @DisplayName("[TC-015] Backend integration test validates state transition errors - already approved")
    void testStateTransitionError_AlreadyApproved() throws Exception {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("comment", "Trying to approve again");

        mockMvc.perform(post("/api/approvals/{id}/approve", approvedRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.title").exists())
            .andExpect(jsonPath("$.status").value(409))
            .andExpect(jsonPath("$.detail").value(containsString("already approved")));
    }

    @Test
    @WithMockUser(username = "approver-106")
    @DisplayName("[TC-015] Backend integration test validates state transition errors - already rejected")
    void testStateTransitionError_AlreadyRejected() throws Exception {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("comment", "Trying to reject again");

        mockMvc.perform(post("/api/approvals/{id}/reject", rejectedRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.title").exists())
            .andExpect(jsonPath("$.status").value(409))
            .andExpect(jsonPath("$.detail").value(containsString("already rejected")));
    }

    @Test
    @WithMockUser(username = "approver-107")
    @DisplayName("[TC-015] Backend integration test validates state transition errors - cannot reject approved request")
    void testStateTransitionError_CannotRejectApproved() throws Exception {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("comment", "Trying to reject an approved request");

        mockMvc.perform(post("/api/approvals/{id}/reject", approvedRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.title").exists())
            .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    @WithMockUser(username = "approver-108")
    @DisplayName("Idempotency - same key returns cached result")
    void testIdempotency_SameKeyReturnsCachedResult() throws Exception {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("comment", "First approval");
        String idempotencyKey = UUID.randomUUID().toString();

        String firstResponse = mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", idempotencyKey)
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.comment").value("First approval"))
            .andReturn()
            .getResponse()
            .getContentAsString();

        requestBody.put("comment", "Second approval attempt with same key");
        String secondResponse = mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", idempotencyKey)
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.comment").value("First approval"))
            .andReturn()
            .getResponse()
            .getContentAsString();

        // Verify both responses are identical
        org.junit.jupiter.api.Assertions.assertEquals(firstResponse, secondResponse);
    }

    @Test
    @WithMockUser(username = "approver-109")
    @DisplayName("Response includes all required fields")
    void testResponseSchema_IncludesAllRequiredFields() throws Exception {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("comment", "Approved with full response check");

        mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(pendingRequest.getId()))
            .andExpect(jsonPath("$.requesterId").value("requester-001"))
            .andExpect(jsonPath("$.resourceType").value("BUDGET_ALLOCATION"))
            .andExpect(jsonPath("$.resourceId").value("budget-2024-q1"))
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.approverId").value("approver-109"))
            .andExpect(jsonPath("$.comment").value("Approved with full response check"))
            .andExpect(jsonPath("$.approvedAt").exists())
            .andExpect(jsonPath("$.createdAt").exists());
    }
}
