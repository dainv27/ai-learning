package com.example.booking.payment.dto;

public record CancelBookingResponseDto(
        String bookingId,
        String refundId,
        String refundStatus,
        String message
) {}
