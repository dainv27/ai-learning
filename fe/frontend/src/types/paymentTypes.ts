export interface CancelBookingResponse {
  bookingId: string;
  refundStatus: string;
  refundTransactionId?: string;
}
