package payment.domain.event;

import java.util.UUID;
import payment.domain.model.RefundStatus;

public record RefundCompleted(UUID refundId, UUID bookingId, RefundStatus status) {
}
