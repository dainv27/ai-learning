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

        // First request: should succeed and create approval
        String firstResponse = mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", idempotencyKey)
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.approverId").value("approver-101"))
            .andExpect(jsonPath("$.comment").value("First approval"))
            .andReturn()
            .getResponse()
            .getContentAsString();

        // Second request: same idempotency key, should return cached result
        Map<String, String> secondRequestBody = new HashMap<>();
        secondRequestBody.put("comment", "Second approval attempt");

        String secondResponse = mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", idempotencyKey)
                .content(objectMapper.writeValueAsString(secondRequestBody)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.approverId").value("approver-101"))
            .andExpect(jsonPath("$.comment").value("First approval"))
            .andReturn()
            .getResponse()
            .getContentAsString();

        // Verify both responses are identical (idempotency)
        assertEquals(firstResponse, secondResponse);

        // Verify database state: still only one approval with original comment
        ApprovalRequest saved = repository.findById(pendingRequest.getId()).orElseThrow();
        assertEquals(ApprovalStatus.APPROVED, saved.getStatus());
        assertEquals("First approval", saved.getComment());
    }

    @Test
    @WithMockUser(username = "approver-102")
    @DisplayName("[TC-014] Backend integration test validates input")
    void testInputValidation() throws Exception {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("comment", "Test comment");

        // Test 1: Missing Idempotency-Key header
        mockMvc.perform(post("/api/approvals/{id}/approve", pendingRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.title").exists())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.detail").exists());

        // Test 2: Invalid UUID format for approval request ID
        mockMvc.perform(post("/api/approvals/{id}/approve", "not-a-valid-uuid")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.title").exists())
            .andExpect(jsonPath("$.status").value(404))
            .andExpect(jsonPath("$.detail").exists());

        // Test 3: Non-existent approval request ID
        String nonExistentId = UUID.randomUUID().toString();
        mockMvc.perform(post("/api/approvals/{id}/approve", nonExistentId)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.title").exists())
            .andExpect(jsonPath("$.status").value(404))
            .andExpect(jsonPath("$.detail").exists());
    }

    @Test
    @WithMockUser(username = "approver-103")
    @DisplayName("[TC-015] Backend integration test validates state transition errors")
    void testStateTransitionValidation() throws Exception {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("comment", "Trying to re-approve");

        // Test 1: Cannot approve an already-approved request
        mockMvc.perform(post("/api/approvals/{id}/approve", approvedRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.title").exists())
            .andExpect(jsonPath("$.status").value(409))
            .andExpect(jsonPath("$.detail").value(containsString("already approved")));

        // Test 2: Cannot reject an already-rejected request
        Map<String, String> rejectBody = new HashMap<>();
        rejectBody.put("comment", "Trying to re-reject");

        mockMvc.perform(post("/api/approvals/{id}/reject", rejectedRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(rejectBody)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.title").exists())
            .andExpect(jsonPath("$.status").value(409))
            .andExpect(jsonPath("$.detail").value(containsString("already rejected")));

        // Test 3: Cannot reject an already-approved request
        mockMvc.perform(post("/api/approvals/{id}/reject", approvedRequest.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .content(objectMapper.writeValueAsString(rejectBody)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.type").exists())
            .andExpect(jsonPath("$.title").exists())
            .andExpect(jsonPath("$.status").value(409))
            .andExpect(jsonPath("$.detail").value(containsString("already approved")));
    }
}
