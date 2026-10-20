package payment.application.port.out;

import java.util.UUID;

public interface BookingCancellationPort {
    void cancel(UUID bookingId);
}
