package demo;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class CancellationServiceTest {
    @Test
    void cancelsAValidBooking() {
        assertTrue(new CancellationService().cancel("booking-123"));
    }
}
