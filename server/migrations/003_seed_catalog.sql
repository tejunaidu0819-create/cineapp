-- ============================================================================
-- CineVerse Neon PostgreSQL Database Engine Seed Catalog Migration
-- Migration: 003_seed_catalog.sql
-- Money in Integer Minor Units (Cents), UUIDs, UTC Timestamps
-- ============================================================================

-- 1. SEED USERS
INSERT INTO users (id, email, password_hash, full_name, phone, role, points)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'admin@cineverse.com', 'admin123', 'Alexander Vance (Lead Manager)', '+1 (212) 555-0199', 'admin', 500),
    ('a0000000-0000-0000-0000-000000000002', 'alex@cineapp.com', 'user123', 'Alex Morgan', '+1 (555) 438-9921', 'customer', 240),
    ('a0000000-0000-0000-0000-000000000003', 'sophia@cineapp.com', 'user123', 'Sophia Reynolds', '+1 (555) 782-1190', 'customer', 150)
ON CONFLICT (email) DO NOTHING;

-- 2. SEED GENRES
INSERT INTO genres (id, name, slug)
VALUES 
    ('g0000000-0000-0000-0000-000000000001', 'Sci-Fi', 'sci-fi'),
    ('g0000000-0000-0000-0000-000000000002', 'Action', 'action'),
    ('g0000000-0000-0000-0000-000000000003', 'Adventure', 'adventure'),
    ('g0000000-0000-0000-0000-000000000004', 'Drama', 'drama'),
    ('g0000000-0000-0000-0000-000000000005', 'Animation', 'animation'),
    ('g0000000-0000-0000-0000-000000000006', 'Biography', 'biography'),
    ('g0000000-0000-0000-0000-000000000007', 'Comedy', 'comedy')
ON CONFLICT (name) DO NOTHING;

-- 3. SEED MOVIES
INSERT INTO movies (id, title, original_title, synopsis, poster_url, backdrop_url, trailer_url, language, duration_mins, release_date, rating, imdb_score, director, cast_list, is_active, is_trending, is_coming_soon)
VALUES
    ('m0000000-0000-0000-0000-000000000001', 'Dune: Part Two', 'Dune: Part Two', 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/Way9Dexny3w', 'English', 166, '2024-03-01', 'PG-13', 8.6, 'Denis Villeneuve', 'Timothée Chalamet, Zendaya, Rebecca Ferguson, Javier Bardem', true, true, false),
    ('m0000000-0000-0000-0000-000000000002', 'Oppenheimer', 'Oppenheimer', 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.', 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/uYPbbksJxIg', 'English', 180, '2023-07-21', 'R', 8.9, 'Christopher Nolan', 'Cillian Murphy, Emily Blunt, Matt Damon, Robert Downey Jr.', true, true, false),
    ('m0000000-0000-0000-0000-000000000003', 'Deadpool & Wolverine', 'Deadpool & Wolverine', 'A listless Wade Wilson toils away in civilian life until his universe faces an existential threat.', 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/73_1biulkYk', 'English', 128, '2024-07-26', 'R', 7.9, 'Shawn Levy', 'Ryan Reynolds, Hugh Jackman, Emma Corrin', true, true, false),
    ('m0000000-0000-0000-0000-000000000004', 'Interstellar: 10th Anniversary IMAX', 'Interstellar', 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity survival.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/zSWdZVtXT7E', 'English', 169, '2014-11-07', 'PG-13', 8.7, 'Christopher Nolan', 'Matthew McConaughey, Anne Hathaway, Jessica Chastain', true, true, false),
    ('m0000000-0000-0000-0000-000000000005', 'Spider-Man: Beyond the Spider-Verse', 'Spider-Man: Beyond the Spider-Verse', 'Miles Morales embarks on a multiversal journey to save all reality.', 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/cqGjhVJWtEg', 'English', 140, '2025-05-15', 'PG', 9.0, 'Joaquim Dos Santos', 'Shameik Moore, Hailee Steinfeld, Oscar Isaac', true, false, true),
    ('m0000000-0000-0000-0000-000000000006', 'Avatar: The Way of Water', 'Avatar: The Way of Water', 'Jake Sully and Neytiri fight to protect their family and Pandora against returning threats.', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/d9MyW72ELq0', 'English', 192, '2022-12-16', 'PG-13', 7.6, 'James Cameron', 'Sam Worthington, Zoe Saldana, Sigourney Weaver', true, false, false),
    ('m0000000-0000-0000-0000-000000000007', 'The Boy and the Heron', 'Kimitachi wa Dō Ikiru ka', 'Mahito enters a magical realm with a talking grey heron and discovers secrets of life and death.', 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/t5khm-VjEu4', 'Japanese', 124, '2023-12-08', 'PG-13', 7.6, 'Hayao Miyazaki', 'Soma Santoki, Masaki Suda, Aimyon', true, false, false),
    ('m0000000-0000-0000-0000-000000000008', 'Gladiator II', 'Gladiator II', 'Lucius enters the Colosseum after his home is conquered by tyrannical emperors.', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/4rgYUipGJNo', 'English', 148, '2024-11-22', 'R', 7.4, 'Ridley Scott', 'Paul Mescal, Pedro Pascal, Denzel Washington', true, true, false)
ON CONFLICT (id) DO NOTHING;

-- 4. SEED CINEMAS
INSERT INTO cinemas (id, name, city, address, phone, amenities, image_url, description)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'CineVerse Grand IMAX Palace', 'New York', '742 7th Ave, Times Square, New York, NY 10036', '+1 (212) 555-0199', 'IMAX with Laser, Dolby Atmos, VIP Lounge, In-Seat Dining', 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80', 'Flagship entertainment hub with custom IMAX laser screen and luxury leather recliners.'),
    ('c0000000-0000-0000-0000-000000000002', 'CineVerse Dolby Luxe Downtown', 'Los Angeles', '1020 S Figueroa St, Los Angeles, CA 90015', '+1 (213) 555-0142', 'Dolby Cinema, Motorized Recliners, Full Bar, Heated Seats', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80', 'Dolby Vision HDR and moving Dolby Atmos audio with reserved gourmet dining.'),
    ('c0000000-0000-0000-0000-000000000003', 'CineVerse Bayfront VIP Cinema', 'San Francisco', '450 Mission St, San Francisco, CA 94105', '+1 (415) 555-0188', 'VIP Lounge, Wine Cellar, 4K Laser Projection, Zero-Gravity Pods', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80', 'Exclusive boutique cinema retreat with artisanal food pairings.'),
    ('c0000000-0000-0000-0000-000000000004', 'CineVerse Millennium 4DX Hub', 'Chicago', '151 E Wacker Dr, Chicago, IL 60601', '+1 (312) 555-0177', '4DX Environmental Effects, RealD 3D, Dolby Surround 7.1', 'https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=1200&q=80', 'Synchronized motion seats, wind, rain, mist, scents, and 3D.')
ON CONFLICT (id) DO NOTHING;

-- 5. SEED AUDITORIUMS (Screen name unique per cinema)
INSERT INTO auditoriums (id, cinema_id, name, hall_type, total_rows, total_cols)
VALUES
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Auditorium 1 - IMAX Grand Laser', 'IMAX', 8, 12),
    ('h0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Auditorium 2 - Dolby Atmos Prime', 'Dolby', 7, 10),
    ('h0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'Screen 1 - Dolby Cinema Supreme', 'Dolby', 8, 12),
    ('h0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'Lounge Hall A - VIP Pods', 'VIP', 5, 8)
ON CONFLICT (cinema_id, name) DO NOTHING;

-- 6. SEED SEATS (Row A-H, Seat 1-12)
-- Generated systematically with tiers: VIP (back rows), ACCESSIBLE (Row A corners), STANDARD (middle)
DO $$
DECLARE
    aud_rec RECORD;
    r_idx INTEGER;
    c_idx INTEGER;
    row_ltr VARCHAR(1);
    tier_val VARCHAR(20);
    row_chars VARCHAR[] := ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
BEGIN
    FOR aud_rec IN SELECT id, total_rows, total_cols, hall_type FROM auditoriums LOOP
        FOR r_idx IN 1..aud_rec.total_rows LOOP
            row_ltr := row_chars[r_idx];
            FOR c_idx IN 1..aud_rec.total_cols LOOP
                IF (aud_rec.hall_type = 'VIP' OR r_idx >= aud_rec.total_rows - 1) THEN
                    tier_val := 'VIP';
                ELSIF (r_idx = 1 AND (c_idx = 1 OR c_idx = aud_rec.total_cols)) THEN
                    tier_val := 'ACCESSIBLE';
                ELSE
                    tier_val := 'STANDARD';
                END IF;

                INSERT INTO seats (auditorium_id, row_label, seat_num, seat_tier)
                VALUES (aud_rec.id, row_ltr, c_idx, tier_val)
                ON CONFLICT (auditorium_id, row_label, seat_num) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- 7. SEED SHOWTIMES (Prices stored in integer minor units - cents)
-- e.g. $21.00 = 2100 cents, $29.50 = 2950 cents
INSERT INTO showtimes (id, movie_id, auditorium_id, start_time, end_time, format_type, base_price_cents, vip_price_cents)
VALUES
    ('s0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000001', 'h0000000-0000-0000-0000-000000000001', (now() AT TIME ZONE 'utc') + INTERVAL '2 hours', (now() AT TIME ZONE 'utc') + INTERVAL '4 hours 45 minutes', 'IMAX 3D Laser', 2100, 2950),
    ('s0000000-0000-0000-0000-000000000002', 'm0000000-0000-0000-0000-000000000002', 'h0000000-0000-0000-0000-000000000002', (now() AT TIME ZONE 'utc') + INTERVAL '5 hours', (now() AT TIME ZONE 'utc') + INTERVAL '8 hours', 'Dolby Cinema Atmos', 1850, 2600),
    ('s0000000-0000-0000-0000-000000000003', 'm0000000-0000-0000-0000-000000000003', 'h0000000-0000-0000-0000-000000000003', (now() AT TIME ZONE 'utc') + INTERVAL '1 day', (now() AT TIME ZONE 'utc') + INTERVAL '1 day 2 hours 15 minutes', 'Dolby Cinema Atmos', 1850, 2600)
ON CONFLICT (id) DO NOTHING;

-- 8. GENERATE SHOWTIME_SEATS
INSERT INTO showtime_seats (showtime_id, seat_id, status)
SELECT st.id, s.id, 'AVAILABLE'
FROM showtimes st
JOIN seats s ON st.auditorium_id = s.auditorium_id
ON CONFLICT (showtime_id, seat_id) DO NOTHING;
