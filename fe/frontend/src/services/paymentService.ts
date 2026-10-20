import { CancelBookingResponse } from '../types/paymentTypes';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export async function cancelBooking(
  bookingId: string,
  reason: string
): Promise<CancelBookingResponse> {
  const url = `${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}/cancel`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  const data: CancelBookingResponse = await response.json();
  return data;
}
