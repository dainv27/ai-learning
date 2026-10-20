package com.example.booking.payment.service;

import com.example.booking.payment.dto.CancelBookingResponseDto;
import com.example.booking.payment.port.BookingStatusPort;
import com.example.booking.payment.port.BookingUpdatePort;
import com.example.booking.payment.port.RefundPort;
import com.example.booking.payment.repository.RefundRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CancelBookingServiceTest {

    @Mock
    private BookingStatusPort bookingStatusPort;

    @Mock
    private BookingUpdatePort bookingUpdatePort;

    @Mock
    private RefundPort refundPort;

    @Mock
    private RefundRepository refundRepository;

    @InjectMocks
    private CancelBookingService cancelBookingService;

    @Test
    void shouldCancelBookingAndReturnResponse() {
        String bookingId = "booking-123";
        String reason = "customer request";
        when(bookingStatusPort.bookingExists(bookingId)).thenReturn(true);
        when(bookingStatusPort.getBookingStatus(bookingId)).thenReturn("CONFIRMED");
        when(refundPort.refund(bookingId, reason)).thenReturn("re_123");

        CancelBookingResponseDto response = cancelBookingService.cancelBooking(bookingId, reason);

        assertNotNull(response);
        assertEquals(bookingId, response.bookingId());
        assertEquals("re_123", response.refundId());
        assertEquals("PENDING", response.refundStatus());
        verify(bookingUpdatePort).updateBookingStatus(bookingId, "CANCELLED");
        verify(refundRepository).save(any());
    }

    @Test
    void shouldThrowWhenBookingDoesNotExist() {
        String bookingId = "missing";
        when(bookingStatusPort.bookingExists(bookingId)).thenReturn(false);

        assertThrows(IllegalStateException.class, () -> cancelBookingService.cancelBooking(bookingId, "reason"));
        verifyNoInteractions(refundPort);
        verifyNoInteractions(bookingUpdatePort);
    }

    @Test
    void shouldThrowWhenBookingNotCancellable() {
        String bookingId = "booking-123";
        when(bookingStatusPort.bookingExists(bookingId)).thenReturn(true);
        when(bookingStatusPort.getBookingStatus(bookingId)).thenReturn("COMPLETED");

        assertThrows(IllegalStateException.class, () -> cancelBookingService.cancelBooking(bookingId, "reason"));
        verifyNoInteractions(refundPort);
        verifyNoInteractions(bookingUpdatePort);
    }
}
