package payment.application.port.out;

import java.util.Optional;
import java.util.UUID;
import payment.domain.model.Refund;

public interface RefundRepository {
    Refund save(Refund refund);

    Optional<Refund> findByBookingIdAndIdempotencyKey(UUID bookingId, UUID idempotencyKey);
}
