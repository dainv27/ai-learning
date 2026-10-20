package payment.adapter.in.rest;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestController;
import payment.adapter.in.rest.generated.BookingCancellationApi;
import payment.adapter.in.rest.generated.CancelBookingRequest;
import payment.adapter.in.rest.generated.RefundResponse;
import payment.application.port.in.CancelBookingRefundUseCase;
import payment.application.service.BookingPaymentNotFoundException;
import payment.domain.model.Refund;

@RestController
public class BookingCancellationController implements BookingCancellationApi {

    private final CancelBookingRefundUseCase cancelBookingRefundUseCase;

    public BookingCancellationController(CancelBookingRefundUseCase cancelBookingRefundUseCase) {
        this.cancelBookingRefundUseCase = cancelBookingRefundUseCase;
    }

    @Override
    public ResponseEntity<RefundResponse> cancelBooking(UUID bookingId, CancelBookingRequest request) {
        Refund refund = cancelBookingRefundUseCase.cancel(bookingId, request.getIdempotencyKey());
        return ResponseEntity.ok(RefundResponse.from(refund));
    }

    @ExceptionHandler(BookingPaymentNotFoundException.class)
    public ResponseEntity<Void> handleBookingPaymentNotFound(BookingPaymentNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }
}
