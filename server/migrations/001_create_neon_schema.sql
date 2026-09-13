-- ============================================================================
-- CineVerse Neon PostgreSQL Database Engine Schema Migration
-- Migration: 001_create_neon_schema.sql
-- All UUID PKs, UTC TIMESTAMPTZ, Money in Integer Minor Units (Cents)
-- ============================================================================

-- Enable pgcrypto / uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'staff')),
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));

-- ----------------------------------------------------------------------------
-- 2. GENRES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

-- ----------------------------------------------------------------------------
-- 3. MOVIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255),
    synopsis TEXT NOT NULL,
    poster_url TEXT NOT NULL,
    backdrop_url TEXT NOT NULL,
    trailer_url TEXT,
    language VARCHAR(50) NOT NULL DEFAULT 'English',
    duration_mins INTEGER NOT NULL CHECK (duration_mins > 0),
    release_date DATE NOT NULL,
    rating VARCHAR(10) NOT NULL,
    imdb_score NUMERIC(3, 1) CHECK (imdb_score >= 0 AND imdb_score <= 10),
    director VARCHAR(255),
    cast_list TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_trending BOOLEAN NOT NULL DEFAULT false,
    is_coming_soon BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_movies_title ON movies (title);
CREATE INDEX IF NOT EXISTS idx_movies_active ON movies (is_active, is_trending, is_coming_soon);

-- ----------------------------------------------------------------------------
-- 4. MOVIE_GENRES (Many-to-Many Join Table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movie_genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    CONSTRAINT uq_movie_genre UNIQUE (movie_id, genre_id)
);

CREATE INDEX IF NOT EXISTS idx_movie_genres_movie ON movie_genres (movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_genres_genre ON movie_genres (genre_id);

-- ----------------------------------------------------------------------------
-- 5. CINEMAS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cinemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    amenities TEXT NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_cinemas_city ON cinemas (city);

-- ----------------------------------------------------------------------------
-- 6. AUDITORIUMS TABLE (With Unique Cinema Screen Constraint)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoriums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cinema_id UUID NOT NULL REFERENCES cinemas(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    hall_type VARCHAR(50) NOT NULL DEFAULT 'Standard 2D',
    total_rows INTEGER NOT NULL CHECK (total_rows > 0),
    total_cols INTEGER NOT NULL CHECK (total_cols > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    CONSTRAINT uq_cinema_screen_name UNIQUE (cinema_id, name)
);

CREATE INDEX IF NOT EXISTS idx_auditoriums_cinema ON auditoriums (cinema_id);

-- ----------------------------------------------------------------------------
-- 7. SEATS TABLE (With Unique Auditorium Seat Position Constraint)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditorium_id UUID NOT NULL REFERENCES auditoriums(id) ON DELETE CASCADE,
    row_label VARCHAR(5) NOT NULL,
    seat_num INTEGER NOT NULL CHECK (seat_num > 0),
    seat_tier VARCHAR(20) NOT NULL DEFAULT 'STANDARD' CHECK (seat_tier IN ('STANDARD', 'VIP', 'ACCESSIBLE', 'PREMIUM')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    CONSTRAINT uq_auditorium_seat_position UNIQUE (auditorium_id, row_label, seat_num)
);

CREATE INDEX IF NOT EXISTS idx_seats_auditorium ON seats (auditorium_id, row_label);

-- ----------------------------------------------------------------------------
-- 8. SHOWTIMES TABLE (Money in integer minor units - cents)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS showtimes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    auditorium_id UUID NOT NULL REFERENCES auditoriums(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    format_type VARCHAR(50) NOT NULL DEFAULT 'Standard 2D',
    base_price_cents INTEGER NOT NULL CHECK (base_price_cents >= 0),
    vip_price_cents INTEGER NOT NULL CHECK (vip_price_cents >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    CONSTRAINT chk_showtime_duration CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_showtimes_movie ON showtimes (movie_id, start_time);
CREATE INDEX IF NOT EXISTS idx_showtimes_auditorium ON showtimes (auditorium_id, start_time);
CREATE INDEX IF NOT EXISTS idx_showtimes_start_time ON showtimes (start_time);

-- ----------------------------------------------------------------------------
-- 9. SHOWTIME_SEATS TABLE (With Unique Double-Booking Prevention Constraint)
-- Status: AVAILABLE, HELD, BOOKED, or BLOCKED
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS showtime_seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    showtime_id UUID NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED')),
    hold_expires_at TIMESTAMPTZ,
    held_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    held_by_session_id VARCHAR(255),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    CONSTRAINT uq_showtime_seat UNIQUE (showtime_id, seat_id)
);

CREATE INDEX IF NOT EXISTS idx_showtime_seats_lookup ON showtime_seats (showtime_id, status);
CREATE INDEX IF NOT EXISTS idx_showtime_seats_expiry ON showtime_seats (status, hold_expires_at) WHERE status = 'HELD';

-- ----------------------------------------------------------------------------
-- 10. BOOKINGS TABLE (Money in integer cents)
-- Status: PENDING, CONFIRMED, CANCELLED, EXPIRED, or REFUNDED
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    showtime_id UUID NOT NULL REFERENCES showtimes(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
    booking_fee_cents INTEGER NOT NULL CHECK (booking_fee_cents >= 0),
    discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    booking_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (booking_status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'REFUNDED')),
    hold_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings (booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings (LOWER(customer_email));
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (booking_status, hold_expires_at);

-- ----------------------------------------------------------------------------
-- 11. BOOKING_ITEMS TABLE (With Unique Seat-per-Booking Constraint)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    showtime_seat_id UUID NOT NULL REFERENCES showtime_seats(id) ON DELETE RESTRICT,
    seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
    seat_tier VARCHAR(20) NOT NULL,
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    CONSTRAINT uq_booking_showtime_seat UNIQUE (booking_id, showtime_seat_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items (booking_id);

-- ----------------------------------------------------------------------------
-- 12. PAYMENTS TABLE (Separate Payment Status + Unique Idempotency Key)
-- Status: PENDING, SUCCEEDED, FAILED, REFUNDED
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_transaction_id VARCHAR(255),
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON payments (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

-- ----------------------------------------------------------------------------
-- 13. TICKETS TABLE (Digital Pass with QR Code)
-- Status: VALID, CHECKED_IN, CANCELLED, VOID
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    booking_item_id UUID NOT NULL REFERENCES booking_items(id) ON DELETE CASCADE,
    ticket_code VARCHAR(50) UNIQUE NOT NULL,
    qr_code_data TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'CHECKED_IN', 'CANCELLED', 'VOID')),
    checked_in_at TIMESTAMPTZ,
    checked_in_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets (ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_booking ON tickets (booking_id);

-- ----------------------------------------------------------------------------
-- 14. AUDIT_LOGS TABLE (Structured Entity & Transaction Auditing)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs (created_at DESC);
