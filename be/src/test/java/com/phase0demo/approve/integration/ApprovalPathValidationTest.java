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
import static org.junit.jupiter.api.Assertions.assertEquals;
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

        // Verify database state: approverId is from authentication, not request body
        ApprovalRequest saved = repository.findById(pendingRequest.getId()).orElseThrow();
        assertEquals("approver-100", saved.getApproverId());
        assertEquals(ApprovalStatus.APPROVED, saved.getStatus());
    }

    @Test
    @WithMockUser(username = "approver-101")
    @DisplayName("[TC-013] Backend integration test validates idempotency")
    void testIdempotencyKeyEnforcement() throws Exception {
        String idempotencyKey = UUID.randomUUID().toString();
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("comment", "First approval");

        // First request
        String firstResponse = mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", idempotencyKey)
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.approverId").value("approver-101"))
            .andReturn()
            .getResponse()
            .getContentAsString();

        Map<String, Object> firstResult = objectMapper.readValue(firstResponse, Map.class);
        String firstApprovedAt = (String) firstResult.get("approvedAt");

        // Second request with same idempotency key should return cached result
        requestBody.put("comment", "Second approval attempt");
        String secondResponse = mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", idempotencyKey)
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.approvedAt").value(firstApprovedAt))
            .andReturn()
            .getResponse()
            .getContentAsString();

        // Verify timestamps match (idempotent response)
        Map<String, Object> secondResult = objectMapper.readValue(secondResponse, Map.class);
        assertEquals(firstApprovedAt, secondResult.get("approvedAt"));
    }

    @Test
    @WithMockUser(username = "approver-102")
    @DisplayName("[TC-014] Backend integration test validates input")
    void testInputValidation() throws Exception {
        // Test 1: Missing Idempotency-Key header
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("comment", "Test comment");

        mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.title").value("Bad Request"))
            .andExpect(jsonPath("$.detail").value(containsString("Idempotency-Key")));

        // Test 2: Malformed JSON body
        mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content("{malformed json"))
            .andExpect(status().isBadRequest());

        // Test 3: Non-existent approval request ID
        String nonExistentId = UUID.randomUUID().toString();
        mockMvc.perform(post("/api/approvals/{id}/approve", nonExistentId)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.title").value("Not Found"))
            .andExpect(jsonPath("$.detail").value(containsString(nonExistentId)));
    }

    @Test
    @WithMockUser(username = "approver-103")
    @DisplayName("[TC-015] Backend integration test validates state transition errors")
    void testStateTransitionErrors() throws Exception {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("comment", "Attempting invalid transition");

        // Test 1: Try to approve an already-approved request
        mockMvc.perform(post("/api/approvals/{id}/approve", approvedRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.title").value("Conflict"))
            .andExpect(jsonPath("$.detail").value(containsString("already approved")))
            .andExpect(jsonPath("$.status").value(409));

        // Test 2: Try to reject an already-rejected request
        mockMvc.perform(post("/api/approvals/{id}/reject", rejectedRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.title").value("Conflict"))
            .andExpect(jsonPath("$.detail").value(containsString("already rejected")))
            .andExpect(jsonPath("$.status").value(409));

        // Test 3: Try to approve an already-rejected request
        mockMvc.perform(post("/api/approvals/{id}/approve", rejectedRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.title").value("Conflict"))
            .andExpect(jsonPath("$.detail").value(containsString("already rejected")))
            .andExpect(jsonPath("$.status").value(409));

        // Test 4: Try to reject an already-approved request
        mockMvc.perform(post("/api/approvals/{id}/reject", approvedRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.title").value("Conflict"))
            .andExpect(jsonPath("$.detail").value(containsString("already approved")))
            .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    @WithMockUser(username = "approver-104")
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
            .andExpect(jsonPath("$.approverId").value("approver-104"))
            .andExpect(jsonPath("$.comment").value("Does not meet requirements"))
            .andExpect(jsonPath("$.rejectedAt").exists());

        // Verify database state
        ApprovalRequest saved = repository.findById(pendingRequest.getId()).orElseThrow();
        assertEquals("approver-104", saved.getApproverId());
        assertEquals(ApprovalStatus.REJECTED, saved.getStatus());
    }

    @Test
    @WithMockUser(username = "approver-105")
    @DisplayName("Complete approval flow - PENDING -> APPROVED")
    void testCompleteApprovalFlow() throws Exception {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("comment", "Budget allocation approved");

        mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(pendingRequest.getId()))
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.approverId").value("approver-105"))
            .andExpect(jsonPath("$.comment").value("Budget allocation approved"))
            .andExpect(jsonPath("$.approvedAt").exists())
            .andExpect(jsonPath("$.rejectedAt").doesNotExist())
            .andExpect(jsonPath("$.requesterId").value("requester-001"))
            .andExpect(jsonPath("$.resourceType").value("BUDGET_ALLOCATION"))
            .andExpect(jsonPath("$.resourceId").value("budget-2024-q1"));
    }

    @Test
    @WithMockUser(username = "approver-106")
    @DisplayName("Complete rejection flow - PENDING -> REJECTED")
    void testCompleteRejectionFlow() throws Exception {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("comment", "Budget allocation rejected due to constraints");

        mockMvc.perform(post("/api/approvals/{id}/reject", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(pendingRequest.getId()))
            .andExpect(jsonPath("$.status").value("REJECTED"))
            .andExpect(jsonPath("$.approverId").value("approver-106"))
            .andExpect(jsonPath("$.comment").value("Budget allocation rejected due to constraints"))
            .andExpect(jsonPath("$.rejectedAt").exists())
            .andExpect(jsonPath("$.approvedAt").doesNotExist())
            .andExpect(jsonPath("$.requesterId").value("requester-001"))
            .andExpect(jsonPath("$.resourceType").value("BUDGET_ALLOCATION"))
            .andExpect(jsonPath("$.resourceId").value("budget-2024-q1"));
    }
}
