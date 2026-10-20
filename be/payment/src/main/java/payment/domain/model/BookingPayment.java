package payment.domain.model;

import java.math.BigDecimal;
import java.util.UUID;

public class BookingPayment {

    private final UUID id;
    private final UUID bookingId;
    private final BigDecimal amount;
    private final String currency;
    private final Status status;

    public BookingPayment(UUID id, UUID bookingId, BigDecimal amount, String currency, Status status) {
        this.id = id;
        this.bookingId = bookingId;
        this.amount = amount;
        this.currency = currency;
        this.status = status;
    }

    public UUID getId() {
        return id;
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public Status getStatus() {
        return status;
    }

    public enum Status {
        AUTHORIZED, CAPTURED, REFUNDED, PARTIALLY_REFUNDED
    }
}
