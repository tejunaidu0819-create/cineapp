import crypto from 'crypto';
import { query, transaction } from '../db/neon-client.js';

function generateReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'CNV-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createSeatHoldAndPendingBooking({
  showtimeId,
  seatIds,
  customerName,
  customerEmail,
  customerPhone,
  userId = null,
  concessions = [],
  discountCents = 0,
  holdDurationMinutes = 10,
  ipAddress = null
}) {
  if (!showtimeId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    throw new Error('Showtime ID and at least one seat must be provided.');
  }

  if (!customerName || !customerEmail || !customerPhone) {
    throw new Error('Customer name, email, and phone number are required.');
  }

  return await transaction(async (client) => {
    // 1. Fetch showtime details
    const showtimeRes = await client.query(`
      SELECT 
        st.id, st.movie_id, st.auditorium_id, st.start_time, st.base_price_cents, st.vip_price_cents,
        m.title as movie_title,
        a.name as auditorium_name,
        c.name as cinema_name
      FROM showtimes st
      JOIN movies m ON st.movie_id = m.id
      JOIN auditoriums a ON st.auditorium_id = a.id
      JOIN cinemas c ON a.cinema_id = c.id
      WHERE st.id = $1
    `, [showtimeId]);

    if (!showtimeRes.rows || showtimeRes.rows.length === 0) {
      throw new Error(`Showtime with ID ${showtimeId} was not found.`);
    }
    const showtime = showtimeRes.rows[0];

    // 2. Lock requested showtime-seat records
    const seatPlaceholders = seatIds.map((_, i) => `$${i + 2}`).join(',');
    const lockSeatsQuery = `
      SELECT 
        ss.id as showtime_seat_id,
        ss.showtime_id,
        ss.seat_id,
        ss.status,
        ss.hold_expires_at,
        ss.held_by_user_id,
        s.row_label,
        s.seat_num,
        s.seat_tier
      FROM showtime_seats ss
      JOIN seats s ON ss.seat_id = s.id
      WHERE ss.showtime_id = $1 AND ss.seat_id IN (${seatPlaceholders})
      FOR UPDATE
    `;

    const lockedSeatsRes = await client.query(lockSeatsQuery, [showtimeId, ...seatIds]);
    const lockedSeats = lockedSeatsRes.rows || [];

    if (lockedSeats.length !== seatIds.length) {
      throw new Error(`One or more requested seats do not exist in this auditorium.`);
    }

    // 3. Availability check
    const nowUtc = new Date();
    const unavailableSeats = [];

    for (const seat of lockedSeats) {
      const isExpiredHold = seat.status === 'HELD' && seat.hold_expires_at && new Date(seat.hold_expires_at) < nowUtc;
      const isAvailable = seat.status === 'AVAILABLE' || isExpiredHold;

      if (!isAvailable) {
        unavailableSeats.push(`Row ${seat.row_label}-${seat.seat_num} (${seat.status})`);
      }
    }

    if (unavailableSeats.length > 0) {
      throw new Error(`Seat reservation rejected: The following seat(s) are no longer available: ${unavailableSeats.join(', ')}.`);
    }

    // 4. Temporary seat hold
    const holdExpiresAt = new Date(nowUtc.getTime() + holdDurationMinutes * 60 * 1000);
    const updateHoldQuery = `
      UPDATE showtime_seats
      SET 
        status = 'HELD',
        hold_expires_at = $1,
        held_by_user_id = $2,
        updated_at = (now() AT TIME ZONE 'utc')
      WHERE showtime_id = $3 AND seat_id IN (${seatPlaceholders})
    `;

    await client.query(updateHoldQuery, [holdExpiresAt.toISOString(), userId, showtimeId, ...seatIds]);

    // 5. Price calculation in Cents
    let seatsSubtotalCents = 0;
    const seatItemData = [];

    for (const seat of lockedSeats) {
      let seatPriceCents = showtime.base_price_cents || 2100;
      if (seat.seat_tier === 'VIP') {
        seatPriceCents = showtime.vip_price_cents || 2950;
      }
      seatsSubtotalCents += seatPriceCents;
      seatItemData.push({
        showtimeSeatId: seat.showtime_seat_id,
        seatId: seat.seat_id,
        seatTier: seat.seat_tier,
        unitPriceCents: seatPriceCents,
        rowLabel: seat.row_label,
        seatNum: seat.seat_num
      });
    }

    let concessionsSubtotalCents = 0;
    for (const c of concessions) {
      concessionsSubtotalCents += (c.unit_price_cents * c.quantity);
    }

    const bookingFeeCents = seatIds.length * 175;
    const subtotalCents = seatsSubtotalCents + concessionsSubtotalCents;
    const cleanDiscountCents = Math.max(0, parseInt(discountCents || 0, 10));
    const totalCents = Math.max(0, subtotalCents + bookingFeeCents - cleanDiscountCents);

    // 6. Create Pending Booking
    const bookingReference = generateReference();
    const bookingId = crypto.randomUUID();

    await client.query(`
      INSERT INTO bookings (
        id,
        booking_reference,
        user_id,
        showtime_id,
        customer_name,
        customer_email,
        customer_phone,
        subtotal_cents,
        booking_fee_cents,
        discount_cents,
        total_cents,
        booking_status,
        hold_expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', $12)
    `, [
      bookingId,
      bookingReference,
      userId,
      showtimeId,
      customerName,
      customerEmail,
      customerPhone,
      subtotalCents,
      bookingFeeCents,
      cleanDiscountCents,
      totalCents,
      holdExpiresAt.toISOString()
    ]);

    // Insert items
    for (const item of seatItemData) {
      await client.query(`
        INSERT INTO booking_items (
          id,
          booking_id,
          showtime_seat_id,
          seat_id,
          seat_tier,
          unit_price_cents
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        crypto.randomUUID(),
        bookingId,
        item.showtimeSeatId,
        item.seatId,
        item.seatTier,
        item.unitPriceCents
      ]);
    }

    // 7. Audit Log
    await client.query(`
      INSERT INTO audit_logs (id, entity_type, entity_id, action, actor_id, actor_type, ip_address, new_state)
      VALUES ($1, 'BOOKING', $2, 'SEAT_HOLD_CREATED', $3, CASE WHEN $3 IS NOT NULL THEN 'USER' ELSE 'GUEST' END, $4, $5)
    `, [
      crypto.randomUUID(),
      bookingId,
      userId,
      ipAddress,
      JSON.stringify({
        bookingReference,
        seatsCount: seatIds.length,
        totalCents,
        holdExpiresAt
      })
    ]);

    return {
      success: true,
      bookingId,
      bookingReference,
      bookingStatus: 'PENDING',
      holdExpiresAt: holdExpiresAt.toISOString(),
      subtotalCents,
      bookingFeeCents,
      discountCents: cleanDiscountCents,
      totalCents,
      seats: seatItemData.map(s => `Row ${s.rowLabel}-${s.seatNum}`),
      showtime: {
        id: showtime.id,
        movieTitle: showtime.movie_title,
        cinemaName: showtime.cinema_name,
        auditoriumName: showtime.auditorium_name,
        startTime: showtime.start_time
      }
    };
  });
}
