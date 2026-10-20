package payment.adapter.in.rest.generated;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "BookingCancellation", description = "Cancel a booking and trigger refund")
public interface BookingCancellationApi {

    @Operation(summary = "Cancel a booking and refund the payment")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Refund processed"),
        @ApiResponse(responseCode = "400", description = "Invalid request"),
        @ApiResponse(responseCode = "404", description = "Booking payment not found"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping(value = "/bookings/{bookingId}/cancellation", consumes = "application/json", produces = "application/json")
    ResponseEntity<RefundResponse> cancelBooking(
            @PathVariable("bookingId") UUID bookingId,
            @RequestBody CancelBookingRequest request);
}
