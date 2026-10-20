package payment.application.port.out;

import java.util.UUID;

public interface OutboxPublisher {
    void publish(OutboxMessage message);

    record OutboxMessage(String eventType, UUID refundId, UUID bookingId, String payload) {
    }
}
