package payment.adapter.out.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import payment.application.port.out.BookingPaymentRepository;
import payment.domain.model.BookingPayment;

@Repository
public class JpaBookingPaymentRepositoryAdapter implements BookingPaymentRepository {

    private final BookingPaymentJpaRepository jpaRepository;

    public JpaBookingPaymentRepositoryAdapter(BookingPaymentJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Optional<BookingPayment> findByBookingId(UUID bookingId) {
        return jpaRepository.findByBookingId(bookingId).map(this::toDomain);
    }

    private BookingPayment toDomain(BookingPaymentJpaEntity entity) {
        return new BookingPayment(entity.getId(), entity.getBookingId(), entity.getAmount(),
                entity.getCurrency(), BookingPayment.Status.valueOf(entity.getStatus()));
    }
}
