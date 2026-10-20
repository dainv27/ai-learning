package payment.application.port.out;

import java.util.Optional;
import java.util.UUID;
import payment.domain.model.BookingPayment;

public interface BookingPaymentRepository {
    Optional<BookingPayment> findByBookingId(UUID bookingId);
}
