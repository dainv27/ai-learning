package payment.adapter.out.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefundJpaRepository extends JpaRepository<RefundJpaEntity, UUID> {

    Optional<RefundJpaEntity> findByBookingIdAndIdempotencyKey(UUID bookingId, UUID idempotencyKey);
}
