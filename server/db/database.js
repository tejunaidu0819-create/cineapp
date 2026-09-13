import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'cineverse.db');

let rawDb = null;
let isSeeding = false;

// Save database to disk
function saveToDisk() {
  if (rawDb && !isSeeding) {
    const data = rawDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function sanitizeParams(params) {
  return params.flat().map(p => {
    if (typeof p === 'boolean') return p ? 1 : 0;
    return p;
  });
}

export const db = {
  prepare(sql) {
    return {
      all(...params) {
        if (!rawDb) throw new Error('Database not initialized');
        try {
          const sanitized = sanitizeParams(params);
          const stmt = rawDb.prepare(sql);
          if (sanitized.length > 0) {
            stmt.bind(sanitized);
          }
          const results = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (e) {
          console.error('SQL all error:', sql, params, e);
          throw e;
        }
      },
      get(...params) {
        if (!rawDb) throw new Error('Database not initialized');
        try {
          const sanitized = sanitizeParams(params);
          const stmt = rawDb.prepare(sql);
          if (sanitized.length > 0) {
            stmt.bind(sanitized);
          }
          let result = undefined;
          if (stmt.step()) {
            result = stmt.getAsObject();
          }
          stmt.free();
          return result;
        } catch (e) {
          console.error('SQL get error:', sql, params, e);
          throw e;
        }
      },
      run(...params) {
        if (!rawDb) throw new Error('Database not initialized');
        try {
          const sanitized = sanitizeParams(params);
          const stmt = rawDb.prepare(sql);
          if (sanitized.length > 0) {
            stmt.run(sanitized);
          } else {
            stmt.run();
          }
          stmt.free();

          const lastIdRes = rawDb.exec('SELECT last_insert_rowid() as id');
          const lastInsertRowid = lastIdRes.length > 0 && lastIdRes[0].values.length > 0 ? lastIdRes[0].values[0][0] : 0;
          
          saveToDisk();

          return {
            lastInsertRowid,
            changes: rawDb.getRowsModified()
          };
        } catch (e) {
          console.error('SQL run error:', sql, params, e);
          throw e;
        }
      }
    };
  },
  exec(sql) {
    if (!rawDb) throw new Error('Database not initialized');
    rawDb.exec(sql);
    saveToDisk();
  },
  pragma(str) {
    if (rawDb) {
      try {
        rawDb.exec(`PRAGMA ${str};`);
      } catch (e) {}
    }
  },
  transaction(fn) {
    return async (...args) => {
      if (!rawDb) throw new Error('Database not initialized');
      try {
        rawDb.exec('BEGIN TRANSACTION;');
      } catch (e) {}
      try {
        const result = await fn(...args);
        try {
          rawDb.exec('COMMIT;');
        } catch (e) {}
        saveToDisk();
        return result;
      } catch (error) {
        try {
          rawDb.exec('ROLLBACK;');
        } catch (e) {}
        throw error;
      }
    };
  }
};

export async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    rawDb = new SQL.Database(fileBuffer);
  } else {
    rawDb = new SQL.Database();
  }

  // Schema matching both SQLite & PostgreSQL models
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      password_hash TEXT,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'customer',
      points INTEGER DEFAULT 120,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS genres (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      original_title TEXT,
      synopsis TEXT NOT NULL,
      poster_url TEXT NOT NULL,
      backdrop_url TEXT NOT NULL,
      trailer_url TEXT NOT NULL,
      genre TEXT DEFAULT '',
      language TEXT NOT NULL,
      duration_mins INTEGER NOT NULL,
      release_date TEXT NOT NULL,
      rating TEXT NOT NULL,
      imdb_score REAL NOT NULL,
      cast_list TEXT NOT NULL,
      director TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      is_trending INTEGER DEFAULT 0,
      is_coming_soon INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS movie_genres (
      id TEXT PRIMARY KEY,
      movie_id TEXT NOT NULL,
      genre_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(movie_id, genre_id)
    );

    CREATE TABLE IF NOT EXISTS cinemas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      amenities TEXT NOT NULL,
      image_url TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auditoriums (
      id TEXT PRIMARY KEY,
      cinema_id TEXT NOT NULL,
      name TEXT NOT NULL,
      hall_type TEXT NOT NULL,
      total_rows INTEGER NOT NULL,
      total_cols INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cinema_id, name)
    );

    CREATE TABLE IF NOT EXISTS halls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cinema_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      hall_type TEXT NOT NULL,
      total_rows INTEGER NOT NULL,
      total_cols INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seats (
      id TEXT PRIMARY KEY,
      auditorium_id TEXT,
      hall_id INTEGER,
      row_label TEXT NOT NULL,
      seat_num INTEGER NOT NULL,
      seat_tier TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(auditorium_id, row_label, seat_num)
    );

    CREATE TABLE IF NOT EXISTS showtimes (
      id TEXT PRIMARY KEY,
      movie_id TEXT NOT NULL,
      auditorium_id TEXT,
      hall_id INTEGER,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      format_type TEXT NOT NULL,
      base_price REAL DEFAULT 16.50,
      vip_price REAL DEFAULT 24.50,
      base_price_cents INTEGER DEFAULT 1650,
      vip_price_cents INTEGER DEFAULT 2450,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS showtime_seats (
      id TEXT PRIMARY KEY,
      showtime_id TEXT NOT NULL,
      seat_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      hold_expires_at DATETIME,
      held_by_user_id TEXT,
      held_by_session_id TEXT,
      version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(showtime_id, seat_id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_reference TEXT UNIQUE NOT NULL,
      user_id TEXT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      showtime_id TEXT NOT NULL,
      subtotal REAL DEFAULT 0,
      booking_fee REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      subtotal_cents INTEGER DEFAULT 0,
      booking_fee_cents INTEGER DEFAULT 0,
      discount_cents INTEGER DEFAULT 0,
      total_cents INTEGER DEFAULT 0,
      payment_method TEXT DEFAULT 'CREDIT_CARD',
      payment_status TEXT DEFAULT 'PAID',
      booking_status TEXT DEFAULT 'CONFIRMED',
      hold_expires_at DATETIME,
      qr_code_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      cancelled_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS booking_items (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      showtime_seat_id TEXT,
      seat_id TEXT NOT NULL,
      row_label TEXT,
      seat_num INTEGER,
      seat_tier TEXT NOT NULL,
      price REAL DEFAULT 0,
      unit_price_cents INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      idempotency_key TEXT UNIQUE NOT NULL,
      provider TEXT NOT NULL,
      provider_transaction_id TEXT,
      amount_cents INTEGER NOT NULL,
      currency TEXT DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'PENDING',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      booking_item_id TEXT NOT NULL,
      ticket_code TEXT UNIQUE NOT NULL,
      qr_code_data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'VALID',
      checked_in_at DATETIME,
      checked_in_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor_id TEXT,
      actor_type TEXT DEFAULT 'SYSTEM',
      previous_state TEXT,
      new_state TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS concessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      price_cents INTEGER DEFAULT 0,
      image_url TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS booking_concessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id TEXT NOT NULL,
      concession_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movie_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      rating REAL NOT NULL,
      comment TEXT NOT NULL,
      date TEXT NOT NULL
    );
  `);

  // Helper to ensure table columns exist in older database.sqlite instances
  const ensureColumn = (table, column, typeDef) => {
    try {
      const info = db.prepare(`PRAGMA table_info(${table})`).all();
      const exists = info.some(col => col.name === column);
      if (!exists) {
        rawDb.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDef};`);
      }
    } catch (e) {}
  };

  ensureColumn('showtime_seats', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn('showtime_seats', 'hold_expires_at', 'DATETIME');
  ensureColumn('showtime_seats', 'held_by_user_id', 'TEXT');
  ensureColumn('showtime_seats', 'held_by_session_id', 'TEXT');
  ensureColumn('showtime_seats', 'version', 'INTEGER DEFAULT 1');
  ensureColumn('bookings', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn('bookings', 'hold_expires_at', 'DATETIME');
  ensureColumn('bookings', 'booking_status', "TEXT DEFAULT 'CONFIRMED'");
  ensureColumn('bookings', 'subtotal_cents', 'INTEGER DEFAULT 0');
  ensureColumn('bookings', 'booking_fee_cents', 'INTEGER DEFAULT 0');
  ensureColumn('bookings', 'discount_cents', 'INTEGER DEFAULT 0');
  ensureColumn('bookings', 'total_cents', 'INTEGER DEFAULT 0');
  ensureColumn('showtimes', 'base_price_cents', 'INTEGER DEFAULT 1650');
  ensureColumn('showtimes', 'vip_price_cents', 'INTEGER DEFAULT 2450');
  ensureColumn('showtimes', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn('booking_items', 'unit_price_cents', 'INTEGER DEFAULT 0');
  ensureColumn('booking_items', 'showtime_seat_id', 'TEXT');

  isSeeding = true;
  rawDb.exec('BEGIN TRANSACTION;');
  seedData();
  rawDb.exec('COMMIT;');
  isSeeding = false;
  saveToDisk();
}

function seedData() {
  const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (usersCount > 0) {
    return;
  }

  console.log('Seeding initial CineVerse database catalog...');

  // 1. Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password, password_hash, full_name, phone, role, points)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertUser.run('a0000000-0000-0000-0000-000000000001', 'admin@cineverse.com', 'admin123', 'admin123', 'Alexander Vance (Lead Manager)', '+1 (212) 555-0199', 'admin', 500);
  insertUser.run('a0000000-0000-0000-0000-000000000002', 'alex@cineapp.com', 'user123', 'user123', 'Alex Morgan', '+1 (555) 438-9921', 'customer', 240);
  insertUser.run('a0000000-0000-0000-0000-000000000003', 'sophia@cineapp.com', 'user123', 'user123', 'Sophia Reynolds', '+1 (555) 782-1190', 'customer', 150);

  // 2. Seed Cinemas
  const insertCinema = db.prepare(`
    INSERT INTO cinemas (id, name, city, address, phone, amenities, image_url, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const c1 = 'c0000000-0000-0000-0000-000000000001';
  const c2 = 'c0000000-0000-0000-0000-000000000002';
  const c3 = 'c0000000-0000-0000-0000-000000000003';
  const c4 = 'c0000000-0000-0000-0000-000000000004';

  insertCinema.run(c1, 'CineVerse Grand IMAX Palace', 'New York', '742 7th Ave, Times Square, New York, NY 10036', '+1 (212) 555-0199', 'IMAX with Laser, Dolby Atmos, VIP Lounge, Dining', 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80', 'Flagship entertainment hub with custom IMAX laser screen and luxury leather recliners.');
  insertCinema.run(c2, 'CineVerse Dolby Luxe Downtown', 'Los Angeles', '1020 S Figueroa St, Los Angeles, CA 90015', '+1 (213) 555-0142', 'Dolby Cinema, Recliners, Full Bar', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80', 'Dolby Vision HDR and moving Dolby Atmos audio with reserved gourmet dining.');
  insertCinema.run(c3, 'CineVerse Bayfront VIP Cinema', 'San Francisco', '450 Mission St, San Francisco, CA 94105', '+1 (415) 555-0188', 'VIP Lounge, Wine Cellar, 4K Laser', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80', 'Exclusive boutique cinema retreat with artisanal food pairings.');
  insertCinema.run(c4, 'CineVerse Millennium 4DX Hub', 'Chicago', '151 E Wacker Dr, Chicago, IL 60601', '+1 (312) 555-0177', '4DX Motion, RealD 3D, Dolby 7.1', 'https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=1200&q=80', 'Synchronized motion seats, wind, rain, mist, scents, and 3D.');

  // 3. Seed Auditoriums & Halls
  const insertAud = db.prepare(`
    INSERT INTO auditoriums (id, cinema_id, name, hall_type, total_rows, total_cols)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertHall = db.prepare(`
    INSERT INTO halls (id, cinema_id, name, hall_type, total_rows, total_cols)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const auds = [
    { id: 'h0000000-0000-0000-0000-000000000001', numId: 1, cinema_id: c1, name: 'Auditorium 1 - IMAX Grand Laser', hall_type: 'IMAX', rows: 8, cols: 12 },
    { id: 'h0000000-0000-0000-0000-000000000002', numId: 2, cinema_id: c1, name: 'Auditorium 2 - Dolby Atmos Prime', hall_type: 'Dolby', rows: 7, cols: 10 },
    { id: 'h0000000-0000-0000-0000-000000000003', numId: 3, cinema_id: c1, name: 'Auditorium 3 - VIP Luxe Suite', hall_type: 'VIP', rows: 5, cols: 8 },
    { id: 'h0000000-0000-0000-0000-000000000004', numId: 4, cinema_id: c2, name: 'Screen 1 - Dolby Cinema Supreme', hall_type: 'Dolby', rows: 8, cols: 12 },
    { id: 'h0000000-0000-0000-0000-000000000005', numId: 5, cinema_id: c2, name: 'Screen 2 - Laser Standard 4K', hall_type: 'Standard', rows: 7, cols: 10 },
    { id: 'h0000000-0000-0000-0000-000000000006', numId: 6, cinema_id: c3, name: 'Lounge Hall A - VIP Pods', hall_type: 'VIP', rows: 5, cols: 8 },
    { id: 'h0000000-0000-0000-0000-000000000007', numId: 7, cinema_id: c3, name: 'Lounge Hall B - Atmos Classic', hall_type: 'Dolby', rows: 6, cols: 10 },
    { id: 'h0000000-0000-0000-0000-000000000008', numId: 8, cinema_id: c4, name: 'Hall 4DX - Extreme Motion', hall_type: '4DX', rows: 6, cols: 10 }
  ];

  const insertSeat = db.prepare(`
    INSERT INTO seats (id, auditorium_id, hall_id, row_label, seat_num, seat_tier)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  let seatCounter = 1;

  for (const a of auds) {
    insertAud.run(a.id, a.cinema_id, a.name, a.hall_type, a.rows, a.cols);
    insertHall.run(a.numId, a.numId, a.name, a.hall_type, a.rows, a.cols);

    for (let r = 0; r < a.rows; r++) {
      const rowLetter = rowLabels[r];
      for (let c = 1; c <= a.cols; c++) {
        let tier = 'STANDARD';
        if (a.hall_type === 'VIP' || r >= a.rows - 2) {
          tier = 'VIP';
        } else if (r === 0 && (c === 1 || c === a.cols)) {
          tier = 'ACCESSIBLE';
        }
        const seatUuid = `seat0000-0000-0000-${String(a.numId).padStart(4, '0')}-${String(seatCounter++).padStart(12, '0')}`;
        insertSeat.run(seatUuid, a.id, a.numId, rowLetter, c, tier);
      }
    }
  }

  // 4. Seed Movies
  const insertMovie = db.prepare(`
    INSERT INTO movies (
      id, title, original_title, synopsis, poster_url, backdrop_url, trailer_url,
      genre, language, duration_mins, release_date, rating, imdb_score,
      cast_list, director, is_active, is_trending, is_coming_soon
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const m1 = 'm0000000-0000-0000-0000-000000000001';
  const m2 = 'm0000000-0000-0000-0000-000000000002';
  const m3 = 'm0000000-0000-0000-0000-000000000003';
  const m4 = 'm0000000-0000-0000-0000-000000000004';
  const m5 = 'm0000000-0000-0000-0000-000000000005';
  const m6 = 'm0000000-0000-0000-0000-000000000006';
  const m7 = 'm0000000-0000-0000-0000-000000000007';
  const m8 = 'm0000000-0000-0000-0000-000000000008';

  insertMovie.run(m1, 'Dune: Part Two', 'Dune: Part Two', 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators.', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/Way9Dexny3w', 'Sci-Fi, Adventure, Action', 'English', 166, '2024-03-01', 'PG-13', 8.6, 'Timothée Chalamet, Zendaya, Rebecca Ferguson', 'Denis Villeneuve', 1, 1, 0);
  insertMovie.run(m2, 'Oppenheimer', 'Oppenheimer', 'The story of J. Robert Oppenheimer and his role in the development of the atomic bomb.', 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/uYPbbksJxIg', 'Biography, Drama, History', 'English', 180, '2023-07-21', 'R', 8.9, 'Cillian Murphy, Emily Blunt, Matt Damon', 'Christopher Nolan', 1, 1, 0);
  insertMovie.run(m3, 'Deadpool & Wolverine', 'Deadpool & Wolverine', 'Wade Wilson and Wolverine must team up to protect their universe from destruction.', 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/73_1biulkYk', 'Action, Comedy, Sci-Fi', 'English', 128, '2024-07-26', 'R', 7.9, 'Ryan Reynolds, Hugh Jackman', 'Shawn Levy', 1, 1, 0);
  insertMovie.run(m4, 'Interstellar: 10th Anniversary IMAX', 'Interstellar', 'Explorers travel through a wormhole in space in an attempt to ensure humanity survival.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/zSWdZVtXT7E', 'Sci-Fi, Adventure, Drama', 'English', 169, '2014-11-07', 'PG-13', 8.7, 'Matthew McConaughey, Anne Hathaway', 'Christopher Nolan', 1, 1, 0);
  insertMovie.run(m5, 'Spider-Man: Beyond the Spider-Verse', 'Spider-Man: Beyond the Spider-Verse', 'Miles Morales embarks on a multiversal journey to save all reality.', 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/cqGjhVJWtEg', 'Animation, Action', 'English', 140, '2025-05-15', 'PG', 9.0, 'Shameik Moore, Hailee Steinfeld', 'Joaquim Dos Santos', 1, 0, 1);
  insertMovie.run(m6, 'Avatar: The Way of Water', 'Avatar: The Way of Water', 'Jake Sully and Neytiri fight to protect their family and Pandora.', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/d9MyW72ELq0', 'Action, Adventure', 'English', 192, '2022-12-16', 'PG-13', 7.6, 'Sam Worthington, Zoe Saldana', 'James Cameron', 1, 0, 0);
  insertMovie.run(m7, 'The Boy and the Heron', 'Kimitachi wa Dō Ikiru ka', 'Mahito enters a magical realm with a talking grey heron.', 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/t5khm-VjEu4', 'Animation, Adventure', 'Japanese', 124, '2023-12-08', 'PG-13', 7.6, 'Soma Santoki, Masaki Suda', 'Hayao Miyazaki', 1, 0, 0);
  insertMovie.run(m8, 'Gladiator II', 'Gladiator II', 'Lucius enters the Colosseum after his home is conquered.', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80', 'https://www.youtube.com/embed/4rgYUipGJNo', 'Action, Adventure', 'English', 148, '2024-11-22', 'R', 7.4, 'Paul Mescal, Pedro Pascal', 'Ridley Scott', 1, 1, 0);

  // 5. Seed Showtimes
  const insertShowtime = db.prepare(`
    INSERT INTO showtimes (
      id, movie_id, auditorium_id, hall_id, start_time, end_time, format_type,
      base_price, vip_price, base_price_cents, vip_price_cents
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertShowtimeSeat = db.prepare(`
    INSERT INTO showtime_seats (id, showtime_id, seat_id, status)
    VALUES (?, ?, ?, 'AVAILABLE')
  `);

  const today = new Date();
  const movieIds = [m1, m2, m3, m4, m6, m7, m8];
  const timeSlots = ['11:30', '14:15', '17:00', '19:45', '22:15'];

  let stCounter = 1;
  let ssCounter = 1;

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + dayOffset);
    const dateStr = targetDate.toISOString().split('T')[0];

    for (const a of auds) {
      const dailyMovie = movieIds[(a.numId + dayOffset) % movieIds.length];
      for (let sIdx = 0; sIdx < 2; sIdx++) {
        const slot = timeSlots[(sIdx * 2 + dayOffset) % timeSlots.length];
        const start = `${dateStr} ${slot}`;
        const end = `${dateStr} 23:00`;
        const stUuid = `s0000000-0000-0000-${String(a.numId).padStart(4, '0')}-${String(stCounter++).padStart(12, '0')}`;
        
        insertShowtime.run(
          stUuid,
          dailyMovie,
          a.id,
          a.numId,
          start,
          end,
          a.hall_type === 'IMAX' ? 'IMAX 3D Laser' : 'Dolby Cinema Atmos',
          21.00,
          29.50,
          2100,
          2950
        );

        const hallSeats = db.prepare('SELECT id FROM seats WHERE auditorium_id = ?').all(a.id);
        for (const s of hallSeats) {
          const ssUuid = `ss000000-0000-0000-0000-${String(ssCounter++).padStart(12, '0')}`;
          insertShowtimeSeat.run(ssUuid, stUuid, s.id);
        }
      }
    }
  }

  // 6. Concessions
  const insertConcession = db.prepare(`
    INSERT INTO concessions (name, category, price, price_cents, image_url, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertConcession.run('Truffle & Butter Large Popcorn', 'Popcorn', 9.50, 950, 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=400&q=80', 'French black truffle sea salt and clarified butter.');
  insertConcession.run('Caramel Glazed Popcorn Tub', 'Popcorn', 8.75, 875, 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=400&q=80', 'Vanilla bean and rich caramel glaze.');
  insertConcession.run('CineVerse Epic Combo for Two', 'Combos', 18.50, 1850, 'https://images.unsplash.com/photo-1512149177596-f817c7ef5d4c?auto=format&fit=crop&w=400&q=80', '1 XL Popcorn, 2 Drinks, 1 Choice of Candy.');
  insertConcession.run('Loaded Queso & Guacamole Nachos', 'Gourmet', 11.25, 1125, 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=400&q=80', 'Artisanal queso, jalapeños, guacamole.');
  insertConcession.run('Sparkling Berry Hibiscus Soda', 'Drinks', 6.50, 650, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80', 'Wild blackberry, hibiscus petals, lime.');

  console.log('✅ CineVerse unified database catalog seeded successfully!');
}
