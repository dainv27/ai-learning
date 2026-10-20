package payment.application.service;

import java.util.UUID;

public class BookingPaymentNotFoundException extends RuntimeException {

    public BookingPaymentNotFoundException(UUID bookingId) {
        super("No payment found for booking " + bookingId);
    }
}
