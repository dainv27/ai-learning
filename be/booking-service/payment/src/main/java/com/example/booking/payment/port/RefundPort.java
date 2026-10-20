package com.example.booking.payment.port;

public interface RefundPort {
    String refund(String bookingId, String reason);
}
