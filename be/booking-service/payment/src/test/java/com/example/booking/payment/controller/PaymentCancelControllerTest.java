package com.example.booking.payment.controller;

import com.example.booking.payment.dto.CancelBookingRequestDto;
import com.example.booking.payment.dto.CancelBookingResponseDto;
import com.example.booking.payment.service.CancelBookingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PaymentCancelController.class)
class PaymentCancelControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CancelBookingService cancelBookingService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldReturnOkWhenCancellationSucceeds() throws Exception {
        String bookingId = "booking-123";
        CancelBookingRequestDto request = new CancelBookingRequestDto("customer request");
        CancelBookingResponseDto response = new CancelBookingResponseDto(bookingId, "re_123", "PENDING", "ok");
        when(cancelBookingService.cancelBooking(anyString(), anyString())).thenReturn(response);

        mockMvc.perform(post("/bookings/{bookingId}/cancel", bookingId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingId").value(bookingId))
                .andExpect(jsonPath("$.refundId").value("re_123"));
    }
}
