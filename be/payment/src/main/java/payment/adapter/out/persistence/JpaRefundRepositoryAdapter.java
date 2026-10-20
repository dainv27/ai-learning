package payment.adapter.out.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import payment.application.port.out.RefundRepository;
import payment.domain.model.Refund;

@Repository
public class JpaRefundRepositoryAdapter implements RefundRepository {

    private final RefundJpaRepository jpaRepository;

    public JpaRefundRepositoryAdapter(RefundJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Refund save(Refund refund) {
        return toDomain(jpaRepository.save(toEntity(refund)));
    }

    @Override
    public Optional<Refund> findByBookingIdAndIdempotencyKey(UUID bookingId, UUID idempotencyKey) {
        return jpaRepository.findByBookingIdAndIdempotencyKey(bookingId, idempotencyKey).map(this::toDomain);
    }

    private RefundJpaEntity toEntity(Refund refund) {
        return new RefundJpaEntity(refund.getId(), refund.getBookingId(), refund.getPaymentId(),
                refund.getAmount(), refund.getCurrency(), refund.getIdempotencyKey(), refund.getStatus(),
                refund.getFailureReason(), refund.getGatewayRefundId(), refund.getCreatedAt(),
                refund.getUpdatedAt());
    }

    private Refund toDomain(RefundJpaEntity entity) {
        return new Refund(entity.getId(), entity.getBookingId(), entity.getPaymentId(), entity.getAmount(),
                entity.getCurrency(), entity.getIdempotencyKey(), entity.getStatus(), entity.getFailureReason(),
                entity.getGatewayRefundId(), entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
