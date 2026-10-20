package payment.adapter.out.persistence;

import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import payment.application.port.out.OutboxPublisher;

@Repository
public class JpaOutboxPublisherAdapter implements OutboxPublisher {

    private final RefundOutboxJpaRepository outboxJpaRepository;

    public JpaOutboxPublisherAdapter(RefundOutboxJpaRepository outboxJpaRepository) {
        this.outboxJpaRepository = outboxJpaRepository;
    }

    @Override
    public void publish(OutboxMessage message) {
        RefundOutboxJpaEntity entity = new RefundOutboxJpaEntity(
                UUID.randomUUID(), message.refundId(), message.bookingId(), message.eventType(),
                message.payload(), "PENDING", Instant.now());
        outboxJpaRepository.save(entity);
    }
}
