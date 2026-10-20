package com.example.booking.payment.port;

public interface BookingStatusPort {
    boolean bookingExists(String bookingId);
    String getBookingStatus(String bookingId);
}
