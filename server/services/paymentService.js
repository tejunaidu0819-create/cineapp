import crypto from 'crypto';
import QRCode from 'qrcode';
import { query, transaction } from '../db/neon-client.js';

export async function confirmPaymentAndIssueTickets({
  bookingId,
  idempotencyKey,
  provider = 'STRIPE',
  providerTransactionId = null,
  amountCents,
  currency = 'USD',
  ipAddress = null
}) {
  if (!bookingId || !idempotencyKey) {
    throw new Error('Booking ID and Idempotency Key are required.');
  }

  // Idempotency check
  const existingPaymentRes = await query(`
    SELECT p.*, b.booking_reference, b.booking_status
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    WHERE p.idempotency_key = $1
  `, [idempotencyKey]);

  if (existingPaymentRes.rows && existingPaymentRes.rows.length > 0) {
    const existingPayment = existingPaymentRes.rows[0];
    console.log(`⚡ Idempotent replay detected for key: ${idempotencyKey}`);

    const ticketsRes = await query(`
      SELECT t.id, t.ticket_code, t.qr_code_data, t.status, s.row_label, s.seat_num, bi.seat_tier
      FROM tickets t
      JOIN booking_items bi ON t.booking_item_id = bi.id
      JOIN seats s ON bi.seat_id = s.id
      WHERE t.booking_id = $1
    `, [existingPayment.booking_id]);

    return {
      isIdempotentReplay: true,
      success: true,
      bookingId: existingPayment.booking_id,
      bookingReference: existingPayment.booking_reference,
      bookingStatus: existingPayment.booking_status,
      paymentId: existingPayment.id,
      paymentStatus: existingPayment.status,
      amountCents: existingPayment.amount_cents,
      tickets: ticketsRes.rows || []
    };
  }

  // Confirm seats and payment
  return await transaction(async (client) => {
    const bookingRes = await client.query(`
      SELECT 
        b.*,
        st.start_time,
        st.format_type,
        m.title as movie_title,
        c.name as cinema_name,
        a.name as auditorium_name
      FROM bookings b
      JOIN showtimes st ON b.showtime_id = st.id
      JOIN movies m ON st.movie_id = m.id
      JOIN auditoriums a ON st.auditorium_id = a.id
      JOIN cinemas c ON a.cinema_id = c.id
      WHERE b.id = $1
      FOR UPDATE
    `, [bookingId]);

    if (!bookingRes.rows || bookingRes.rows.length === 0) {
      throw new Error(`Booking ${bookingId} not found.`);
    }

    const booking = bookingRes.rows[0];

    if (booking.booking_status === 'CONFIRMED') {
      throw new Error(`Booking ${booking.booking_reference} is already confirmed.`);
    }

    if (booking.booking_status === 'CANCELLED' || booking.booking_status === 'EXPIRED') {
      throw new Error(`Booking ${booking.booking_reference} has expired or was cancelled.`);
    }

    const nowUtc = new Date();
    if (booking.hold_expires_at && new Date(booking.hold_expires_at) < nowUtc) {
      throw new Error(`Seat hold for booking ${booking.booking_reference} has expired. Please re-select seats.`);
    }

    const requiredAmount = booking.total_cents;
    const effectiveAmount = requiredAmount;
    const txnId = providerTransactionId || `txn_${crypto.randomBytes(12).toString('hex')}`;
    const paymentId = crypto.randomUUID();

    await client.query(`
      INSERT INTO payments (
        id,
        booking_id,
        idempotency_key,
        provider,
        provider_transaction_id,
        amount_cents,
        currency,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUCCEEDED')
    `, [
      paymentId,
      bookingId,
      idempotencyKey,
      provider,
      txnId,
      effectiveAmount,
      currency
    ]);

    // Update booking status
    await client.query(`
      UPDATE bookings
      SET 
        booking_status = 'CONFIRMED',
        hold_expires_at = NULL,
        updated_at = (now() AT TIME ZONE 'utc')
      WHERE id = $1
    `, [bookingId]);

    // Update showtime seats to BOOKED
    const bookingItemsRes = await client.query(`
      SELECT 
        bi.id as booking_item_id,
        bi.showtime_seat_id,
        bi.seat_id,
        bi.seat_tier,
        s.row_label,
        s.seat_num
      FROM booking_items bi
      JOIN seats s ON bi.seat_id = s.id
      WHERE bi.booking_id = $1
    `, [bookingId]);

    const bookingItems = bookingItemsRes.rows || [];
    const showtimeSeatIds = bookingItems.map(bi => bi.showtime_seat_id);

    if (showtimeSeatIds.length > 0) {
      const seatPlaceholders = showtimeSeatIds.map((_, i) => `$${i + 1}`).join(',');
      await client.query(`
        UPDATE showtime_seats
        SET 
          status = 'BOOKED',
          hold_expires_at = NULL,
          updated_at = (now() AT TIME ZONE 'utc')
        WHERE id IN (${seatPlaceholders})
      `, showtimeSeatIds);
    }

    // Generate Tickets
    const generatedTickets = [];

    for (const item of bookingItems) {
      const ticketId = crypto.randomUUID();
      const ticketCode = `TCK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const qrPayload = JSON.stringify({
        ticketCode,
        bookingRef: booking.booking_reference,
        movie: booking.movie_title,
        cinema: booking.cinema_name,
        auditorium: booking.auditorium_name,
        showtime: booking.start_time,
        seat: `Row ${item.row_label}-${item.seat_num}`,
        tier: item.seat_tier,
        guest: booking.customer_name
      });

      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
        margin: 2,
        width: 250,
        color: { dark: '#08090d', light: '#ffffff' }
      });

      await client.query(`
        INSERT INTO tickets (
          id,
          booking_id,
          booking_item_id,
          ticket_code,
          qr_code_data,
          status
        ) VALUES ($1, $2, $3, $4, $5, 'VALID')
      `, [
        ticketId,
        bookingId,
        item.booking_item_id,
        ticketCode,
        qrCodeDataUrl
      ]);

      generatedTickets.push({
        id: ticketId,
        ticket_code: ticketCode,
        qr_code_data: qrCodeDataUrl,
        status: 'VALID',
        rowLabel: item.row_label,
        seatNum: item.seat_num,
        seatTier: item.seat_tier
      });
    }

    // Audit log
    await client.query(`
      INSERT INTO audit_logs (id, entity_type, entity_id, action, actor_id, actor_type, ip_address, new_state)
      VALUES ($1, 'PAYMENT', $2, 'PAYMENT_VERIFIED_CONFIRMED', $3, 'PAYMENT_GATEWAY', $4, $5)
    `, [
      crypto.randomUUID(),
      paymentId,
      booking.user_id,
      ipAddress,
      JSON.stringify({
        bookingReference: booking.booking_reference,
        amountCents: effectiveAmount,
        idempotencyKey,
        ticketsCount: generatedTickets.length
      })
    ]);

    return {
      isIdempotentReplay: false,
      success: true,
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      bookingStatus: 'CONFIRMED',
      paymentId,
      paymentStatus: 'SUCCEEDED',
      amountCents: effectiveAmount,
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      showtime: {
        movieTitle: booking.movie_title,
        cinemaName: booking.cinema_name,
        auditoriumName: booking.auditorium_name,
        startTime: booking.start_time,
        formatType: booking.format_type
      },
      tickets: generatedTickets
    };
  });
}
