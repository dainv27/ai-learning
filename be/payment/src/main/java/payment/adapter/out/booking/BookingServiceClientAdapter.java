package payment.adapter.out.booking;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import payment.application.port.out.BookingCancellationPort;

@Component
public class BookingServiceClientAdapter implements BookingCancellationPort {

    private final RestTemplate restTemplate;
    private final String bookingServiceBaseUrl;

    public BookingServiceClientAdapter(RestTemplate restTemplate,
                                       @Value("${booking-service.base-url:http://localhost:8080}") String bookingServiceBaseUrl) {
        this.restTemplate = restTemplate;
        this.bookingServiceBaseUrl = bookingServiceBaseUrl;
    }

    @Override
    public void cancel(UUID bookingId) {
        String url = bookingServiceBaseUrl + "/bookings/" + bookingId + "/cancellation";
        HttpEntity<Void> requestEntity = new HttpEntity<>(null);
        ResponseEntity<Void> response = restTemplate.exchange(url, HttpMethod.POST, requestEntity, Void.class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Booking service failed to cancel booking " + bookingId);
        }
    }
}
