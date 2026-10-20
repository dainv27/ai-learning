package payment.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import payment.application.port.in.CancelBookingRefundUseCase;
import payment.application.port.out.BookingCancellationPort;
import payment.application.port.out.BookingPaymentRepository;
import payment.application.port.out.OutboxPublisher;
import payment.application.port.out.OutboxPublisher.OutboxMessage;
import payment.application.port.out.PaymentGatewayRefundPort;
import payment.application.port.out.PaymentGatewayRefundPort.GatewayRefundResult;
import payment.application.port.out.PaymentGatewayRefundPort.RefundRequest;
import payment.application.port.out.RefundRepository;
import payment.domain.event.RefundCompleted;
import payment.domain.model.BookingPayment;
import payment.domain.model.Refund;

@Service
public class CancelBookingRefundService implements CancelBookingRefundUseCase {

    private final BookingCancellationPort bookingCancellationPort;
    private final BookingPaymentRepository bookingPaymentRepository;
    private final RefundRepository refundRepository;
    private final PaymentGatewayRefundPort paymentGatewayRefundPort;
    private final OutboxPublisher outboxPublisher;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final ObjectMapper objectMapper;

    public CancelBookingRefundService(BookingCancellationPort bookingCancellationPort,
                                      BookingPaymentRepository bookingPaymentRepository,
                                      RefundRepository refundRepository,
                                      PaymentGatewayRefundPort paymentGatewayRefundPort,
                                      OutboxPublisher outboxPublisher,
                                      ApplicationEventPublisher applicationEventPublisher,
                                      ObjectMapper objectMapper) {
        this.bookingCancellationPort = bookingCancellationPort;
        this.bookingPaymentRepository = bookingPaymentRepository;
        this.refundRepository = refundRepository;
        this.paymentGatewayRefundPort = paymentGatewayRefundPort;
        this.outboxPublisher = outboxPublisher;
        this.applicationEventPublisher = applicationEventPublisher;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public Refund cancel(UUID bookingId, UUID idempotencyKey) {
        Optional<Refund> existing = refundRepository.findByBookingIdAndIdempotencyKey(bookingId, idempotencyKey);
        if (existing.isPresent()) {
            return existing.get();
        }

        bookingCancellationPort.cancel(bookingId);

        BookingPayment payment = bookingPaymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new BookingPaymentNotFoundException(bookingId));

        Refund refund = Refund.createPending(bookingId, payment.getId(), payment.getAmount(),
                payment.getCurrency(), idempotencyKey);

        try {
            refundRepository.save(refund);
        } catch (DataIntegrityViolationException e) {
            return refundRepository.findByBookingIdAndIdempotencyKey(bookingId, idempotencyKey)
                    .orElseThrow(() -> e);
        }

        outboxPublisher.publish(new OutboxMessage(
                "RefundPending", refund.getId(), bookingId, buildOutboxPayload(refund)));

        try {
            GatewayRefundResult result = paymentGatewayRefundPort.refund(
                    new RefundRequest(refund.getId(), bookingId, payment.getAmount(), payment.getCurrency()));
            refund.complete(result.gatewayRefundId());
        } catch (RuntimeException e) {
            refund.fail(e.getMessage());
        }

        Refund savedRefund = refundRepository.save(refund);

        applicationEventPublisher.publishEvent(new RefundCompleted(
                savedRefund.getId(), savedRefund.getBookingId(), savedRefund.getStatus()));

        return savedRefund;
    }

    private String buildOutboxPayload(Refund refund) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "refundId", refund.getId(),
                    "bookingId", refund.getBookingId(),
                    "paymentId", refund.getPaymentId(),
                    "amount", refund.getAmount(),
                    "currency", refund.getCurrency(),
                    "idempotencyKey", refund.getIdempotencyKey()));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not build refund outbox payload", e);
        }
    }
}
