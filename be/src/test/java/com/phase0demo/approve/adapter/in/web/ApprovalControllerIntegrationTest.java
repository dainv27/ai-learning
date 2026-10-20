package com.phase0demo.approve.adapter.in.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.phase0demo.approve.adapter.out.persistence.InMemoryIdempotencyRepository;
import com.phase0demo.approve.adapter.out.persistence.JpaApprovalRepository;
import com.phase0demo.approve.application.service.ApprovalService;
import com.phase0demo.approve.domain.ApprovalRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ApprovalController.class)
@ContextConfiguration(classes = {ApprovalController.class, ApprovalControllerIntegrationTest.TestConfig.class})
class ApprovalControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JpaApprovalRepository approvalRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Configuration
    static class TestConfig {
        @Bean
        public JpaApprovalRepository approvalRepository() {
            return new JpaApprovalRepository();
        }

        @Bean
        public InMemoryIdempotencyRepository idempotencyRepository() {
            return new InMemoryIdempotencyRepository();
        }

        @Bean
        public ApprovalService approvalService(JpaApprovalRepository approvalRepository, InMemoryIdempotencyRepository idempotencyRepository) {
            return new ApprovalService(approvalRepository, idempotencyRepository);
        }
    }

    @BeforeEach
    void setUp() {
        // Clear the in-memory storage
        approvalRepository.save(new ApprovalRequest(UUID.fromString("00000000-0000-0000-0000-000000000001"), "user-123", "resource-456"));
    }

    @Test
    void shouldApproveRequest() throws Exception {
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000001");
        String requestBody = "{\"reviewerId\":\"reviewer-789\",\"comment\":\"Looks good\"}";

        mockMvc.perform(post("/api/approvals/{id}/approve", id)
                .header("Idempotency-Key", "idem-approve-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.approvalRequestId").value(id.toString()))
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.wasIdempotent").value(false));
    }

    @Test
    void shouldReturnIdempotentResponseForDuplicateApproval() throws Exception {
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000001");
        String requestBody = "{\"reviewerId\":\"reviewer-789\",\"comment\":\"Looks good\"}";

        mockMvc.perform(post("/api/approvals/{id}/approve", id)
                .header("Idempotency-Key", "idem-dup-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/approvals/{id}/approve", id)
                .header("Idempotency-Key", "idem-dup-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.approvalRequestId").value(id.toString()))
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.wasIdempotent").value(true));
    }

    @Test
    void shouldRejectRequest() throws Exception {
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000001");
        String requestBody = "{\"reviewerId\":\"reviewer-789\",\"comment\":\"Not compliant\"}";

        mockMvc.perform(post("/api/approvals/{id}/reject", id)
                .header("Idempotency-Key", "idem-reject-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.approvalRequestId").value(id.toString()))
            .andExpect(jsonPath("$.status").value("REJECTED"))
            .andExpect(jsonPath("$.wasIdempotent").value(false));
    }

    @Test
    void shouldReturn404ForNonExistentApprovalRequest() throws Exception {
        UUID id = UUID.fromString("99999999-9999-9999-9999-999999999999");
        String requestBody = "{\"reviewerId\":\"reviewer-789\",\"comment\":\"Approved\"}";

        mockMvc.perform(post("/api/approvals/{id}/approve", id)
                .header("Idempotency-Key", "idem-notfound-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("APPROVAL_NOT_FOUND"));
    }

    @Test
    void shouldReturn409WhenApprovingAlreadyApprovedRequest() throws Exception {
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000001");
        String requestBody = "{\"reviewerId\":\"reviewer-789\",\"comment\":\"First approval\"}";

        mockMvc.perform(post("/api/approvals/{id}/approve", id)
                .header("Idempotency-Key", "idem-first-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk());

        requestBody = "{\"reviewerId\":\"reviewer-999\",\"comment\":\"Second approval\"}";
        mockMvc.perform(post("/api/approvals/{id}/approve", id)
                .header("Idempotency-Key", "idem-second-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code").value("INVALID_STATE_TRANSITION"));
    }

    @Test
    void shouldReturn400ForMissingReviewerId() throws Exception {
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000001");
        String requestBody = "{\"comment\":\"Missing reviewer\"}";

        mockMvc.perform(post("/api/approvals/{id}/approve", id)
                .header("Idempotency-Key", "idem-missing-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400ForMissingIdempotencyKey() throws Exception {
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000001");
        String requestBody = "{\"reviewerId\":\"reviewer-789\",\"comment\":\"Approved\"}";

        mockMvc.perform(post("/api/approvals/{id}/approve", id)
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400ForMissingCommentOnRejection() throws Exception {
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000001");
        String requestBody = "{\"reviewerId\":\"reviewer-789\"}";

        mockMvc.perform(post("/api/approvals/{id}/reject", id)
                .header("Idempotency-Key", "idem-nocomment-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isBadRequest());
    }
}
