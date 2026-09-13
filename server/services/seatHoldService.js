import crypto from 'crypto';
import { query, transaction } from '../db/neon-client.js';

export async function releaseExpiredSeatHolds() {
  const nowUtc = new Date().toISOString();

  return await transaction(async (client) => {
    // 1. Release expired HELD showtime seats back to AVAILABLE
    const releaseSeatsQuery = `
      UPDATE showtime_seats
      SET 
        status = 'AVAILABLE',
        hold_expires_at = NULL,
        held_by_user_id = NULL,
        held_by_session_id = NULL,
        updated_at = (now() AT TIME ZONE 'utc')
      WHERE status = 'HELD' 
        AND hold_expires_at IS NOT NULL 
        AND hold_expires_at < $1
    `;

    const releasedSeatsRes = await client.query(releaseSeatsQuery, [nowUtc]);
    const releasedSeatsCount = releasedSeatsRes.rowCount || 0;

    // 2. Mark pending bookings as EXPIRED
    const expireBookingsQuery = `
      UPDATE bookings
      SET 
        booking_status = 'EXPIRED',
        updated_at = (now() AT TIME ZONE 'utc')
      WHERE booking_status = 'PENDING'
        AND hold_expires_at IS NOT NULL
        AND hold_expires_at < $1
    `;

    const expiredBookingsRes = await client.query(expireBookingsQuery, [nowUtc]);
    const expiredBookingsCount = expiredBookingsRes.rowCount || 0;

    // 3. Structured audit log
    if (releasedSeatsCount > 0 || expiredBookingsCount > 0) {
      await client.query(`
        INSERT INTO audit_logs (
          id,
          entity_type,
          entity_id,
          action,
          actor_type,
          new_state
        ) VALUES (
          $1,
          'SYSTEM_CRON',
          $2,
          'EXPIRED_SEAT_HOLDS_RELEASED',
          'SYSTEM',
          $3
        )
      `, [
        crypto.randomUUID(),
        crypto.randomUUID(),
        JSON.stringify({
          releasedSeatsCount,
          expiredBookingsCount,
          executedAtUtc: nowUtc
        })
      ]);
    }

    return {
      success: true,
      releasedSeatsCount,
      expiredBookingsCount,
      executedAt: nowUtc
    };
  });
}

export function verifyCronSecret(req, res, next) {
  const configuredSecret = process.env.CRON_SECRET || 'cineverse_super_secure_cron_secret_2026';
  
  const authHeader = req.headers['authorization'];
  const cronHeader = req.headers['x-cron-secret'];
  
  let bearerToken = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.substring(7).trim();
  }

  const providedSecret = bearerToken || cronHeader;

  if (!providedSecret || providedSecret !== configuredSecret) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or missing CRON_SECRET authentication header.'
    });
  }

  next();
}
