package com.example.booking.payment.dto;

import jakarta.validation.constraints.NotBlank;

public record CancelBookingRequestDto(
        @NotBlank(message = "Reason must not be blank")
        String reason
) {}
