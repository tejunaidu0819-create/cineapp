-- ============================================================================
-- CineVerse Neon PostgreSQL Database Engine Triggers & Functions
-- Migration: 002_triggers_and_audit.sql
-- Auto UTC updated_at, Automatic Audit Logging, and Stored Procedures
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. UNIVERSAL UTC UPDATED_AT TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at_utc()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = (now() AT TIME ZONE 'utc');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers to tables
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at_utc();

DROP TRIGGER IF EXISTS trg_movies_updated_at ON movies;
CREATE TRIGGER trg_movies_updated_at
BEFORE UPDATE ON movies
FOR EACH ROW EXECUTE FUNCTION set_updated_at_utc();

DROP TRIGGER IF EXISTS trg_cinemas_updated_at ON cinemas;
CREATE TRIGGER trg_cinemas_updated_at
BEFORE UPDATE ON cinemas
FOR EACH ROW EXECUTE FUNCTION set_updated_at_utc();

DROP TRIGGER IF EXISTS trg_auditoriums_updated_at ON auditoriums;
CREATE TRIGGER trg_auditoriums_updated_at
BEFORE UPDATE ON auditoriums
FOR EACH ROW EXECUTE FUNCTION set_updated_at_utc();

DROP TRIGGER IF EXISTS trg_showtimes_updated_at ON showtimes;
CREATE TRIGGER trg_showtimes_updated_at
BEFORE UPDATE ON showtimes
FOR EACH ROW EXECUTE FUNCTION set_updated_at_utc();

DROP TRIGGER IF EXISTS trg_showtime_seats_updated_at ON showtime_seats;
CREATE TRIGGER trg_showtime_seats_updated_at
BEFORE UPDATE ON showtime_seats
FOR EACH ROW EXECUTE FUNCTION set_updated_at_utc();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION set_updated_at_utc();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at_utc();

-- ----------------------------------------------------------------------------
-- 2. AUTOMATIC BOOKING AUDIT LOG TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_booking_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, actor_type, new_state)
        VALUES ('BOOKING', NEW.id, 'CREATED', NEW.user_id, CASE WHEN NEW.user_id IS NOT NULL THEN 'USER' ELSE 'GUEST' END, to_jsonb(NEW));
    ELSIF (TG_OP = 'UPDATE' AND OLD.booking_status IS DISTINCT FROM NEW.booking_status) THEN
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, actor_type, previous_state, new_state)
        VALUES ('BOOKING', NEW.id, 'STATUS_CHANGE_' || NEW.booking_status, NEW.user_id, CASE WHEN NEW.user_id IS NOT NULL THEN 'USER' ELSE 'SYSTEM' END, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_audit ON bookings;
CREATE TRIGGER trg_booking_audit
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION log_booking_audit();

-- ----------------------------------------------------------------------------
-- 3. AUTOMATIC PAYMENT AUDIT LOG TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_payment_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_state)
        VALUES ('PAYMENT', NEW.id, 'INITIATED', 'PAYMENT_GATEWAY', to_jsonb(NEW));
    ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, previous_state, new_state)
        VALUES ('PAYMENT', NEW.id, 'PAYMENT_' || NEW.status, 'PAYMENT_GATEWAY', to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_audit ON payments;
CREATE TRIGGER trg_payment_audit
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION log_payment_audit();

-- ----------------------------------------------------------------------------
-- 4. IDEMPOTENT EXPIRED SEAT HOLD RELEASE FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION release_expired_seat_holds()
RETURNS TABLE (
    released_seats_count INTEGER,
    expired_bookings_count INTEGER
) AS $$
DECLARE
    seats_cnt INTEGER;
    bookings_cnt INTEGER;
BEGIN
    -- 1. Release expired HELD showtime seats back to AVAILABLE
    WITH released AS (
        UPDATE showtime_seats
        SET status = 'AVAILABLE',
            hold_expires_at = NULL,
            held_by_user_id = NULL,
            held_by_session_id = NULL,
            updated_at = (now() AT TIME ZONE 'utc')
        WHERE status = 'HELD'
          AND hold_expires_at < (now() AT TIME ZONE 'utc')
        RETURNING id
    )
    SELECT count(*)::INTEGER INTO seats_cnt FROM released;

    -- 2. Mark corresponding PENDING bookings as EXPIRED
    WITH expired AS (
        UPDATE bookings
        SET booking_status = 'EXPIRED',
            updated_at = (now() AT TIME ZONE 'utc')
        WHERE booking_status = 'PENDING'
          AND hold_expires_at < (now() AT TIME ZONE 'utc')
        RETURNING id
    )
    SELECT count(*)::INTEGER INTO bookings_cnt FROM expired;

    -- 3. Log audit entry if any releases occurred
    IF (seats_cnt > 0 OR bookings_cnt > 0) THEN
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_state)
        VALUES (
            'SYSTEM_CRON',
            gen_random_uuid(),
            'RELEASE_EXPIRED_HOLDS',
            'SYSTEM',
            jsonb_build_object('released_seats', seats_cnt, 'expired_bookings', bookings_cnt, 'timestamp', (now() AT TIME ZONE 'utc'))
        );
    END IF;

    RETURN QUERY SELECT seats_cnt, bookings_cnt;
END;
$$ LANGUAGE plpgsql;
