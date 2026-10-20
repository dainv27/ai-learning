package com.example.booking.payment.port;

public interface BookingUpdatePort {
    void updateBookingStatus(String bookingId, String status);
}
