package payment.application.port.in;

import java.util.UUID;
import payment.domain.model.Refund;

public interface CancelBookingRefundUseCase {
    Refund cancel(UUID bookingId, UUID idempotencyKey);
}
