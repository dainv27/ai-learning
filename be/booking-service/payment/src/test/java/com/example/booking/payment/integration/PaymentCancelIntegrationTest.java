package com.example.booking.payment.integration;

import com.example.booking.payment.adapter.StripeRefundAdapter;
import com.example.booking.payment.port.RefundPort;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PaymentCancelIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StripeRefundAdapter stripeRefundAdapter;

    @Test
    void shouldCancelBookingWithMockPaymentGateway() throws Exception {
        when(stripeRefundAdapter.refund("booking-123", "reason")).thenReturn("re_mock");

        mockMvc.perform(post("/bookings/booking-123/cancel")
                .contentType("application/json")
                .content("{\"reason\":\"reason\"}"))
                .andExpect(status().isOk());
    }
}
