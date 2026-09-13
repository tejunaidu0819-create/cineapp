import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Clock, 
  Calendar, 
  MapPin, 
  Play, 
  Ticket, 
  ArrowLeft, 
  Sparkles, 
  User, 
  MessageSquare,
  ShieldAlert,
  Film
} from 'lucide-react';
import { api } from '../services/api';

export default function MovieDetailsPage({ 
  movieId, 
  onBack, 
  onSelectShowtime, 
  onWatchTrailer 
}) {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedCinemaId, setSelectedCinemaId] = useState('');

  // Generate 7 upcoming dates
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateFormatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  });

  useEffect(() => {
    loadMovieDetails();
  }, [movieId]);

  async function loadMovieDetails() {
    try {
      setLoading(true);
      const data = await api.getMovie(movieId);
      setMovie(data);
    } catch (err) {
      console.error('Failed to load movie:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading movie details & showtimes...
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <h2>Movie not found</h2>
        <button className="btn btn-outline" onClick={onBack} style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Back to Movies
        </button>
      </div>
    );
  }

  const currentDateObj = dates[selectedDateIndex];
  const currentDateStr = currentDateObj?.dateStr;

  // Filter showtimes by selected date and optionally cinema
  const filteredShowtimes = (movie.showtimes || []).filter(s => {
    const sDate = s.start_time.split(' ')[0];
    const matchesDate = sDate === currentDateStr;
    const matchesCinema = !selectedCinemaId || String(s.cinema_id) === String(selectedCinemaId);
    return matchesDate && matchesCinema;
  });

  // Group showtimes by cinema
  const groupedByCinema = {};
  for (const s of filteredShowtimes) {
    if (!groupedByCinema[s.cinema_name]) {
      groupedByCinema[s.cinema_name] = {
        cinemaId: s.cinema_id,
        cinemaCity: s.cinema_city,
        showtimes: []
      };
    }
    groupedByCinema[s.cinema_name].showtimes.push(s);
  }

  return (
    <div className="movie-details-page">
      {/* 1. HERO BACKDROP SECTION */}
      <div style={{
        position: 'relative',
        minHeight: '480px',
        background: `linear-gradient(180deg, rgba(7, 8, 12, 0.4) 0%, rgba(7, 8, 12, 0.95) 90%, #07080c 100%), url(${movie.backdrop_url || movie.poster_url}) center 20% / cover no-repeat`,
        paddingTop: '2rem',
        paddingBottom: '3rem'
      }}>
        <div className="container">
          <button 
            className="btn btn-outline btn-sm"
            onClick={onBack}
            style={{ marginBottom: '2rem', backdropFilter: 'blur(10px)' }}
          >
            <ArrowLeft size={16} /> Back to Catalog
          </button>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '3rem',
            alignItems: 'flex-start'
          }}>
            {/* Movie Poster */}
            <div style={{ maxWidth: '320px', margin: '0 auto' }}>
              <div style={{
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg), 0 0 40px rgba(0,0,0,0.8)',
                border: '1px solid var(--border-subtle)',
                position: 'relative'
              }}>
                <img 
                  src={movie.poster_url} 
                  alt={movie.title} 
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
                {movie.trailer_url && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => onWatchTrailer(movie)}
                    style={{
                      position: 'absolute',
                      bottom: '16px',
                      left: '16px',
                      right: '16px',
                      boxShadow: 'var(--shadow-md)'
                    }}
                  >
                    <Play size={16} /> Watch Trailer
                  </button>
                )}
              </div>
            </div>

            {/* Movie Details */}
            <div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span className="badge badge-gold">{movie.rating}</span>
                <span className="badge badge-cyan">{movie.language}</span>
                <span className="badge badge-purple">{movie.genre}</span>
              </div>

              <h1 style={{ fontSize: '3rem', fontWeight: '900', marginBottom: '0.75rem', lineHeight: 1.1 }}>
                {movie.title}
              </h1>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.5rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.5rem',
                fontSize: '0.95rem'
              }}>
                <div className="movie-score-badge">
                  <Star size={15} fill="currentColor" color="var(--gold-primary)" />
                  <span style={{ fontWeight: '700' }}>{movie.imdb_score ? movie.imdb_score.toFixed(1) : '8.6'}</span>
                  <span style={{ color: 'var(--text-muted)' }}>/ 10 IMDb</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={16} />
                  <span>{movie.duration_mins} Minutes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={16} />
                  <span>Released {movie.release_date}</span>
                </div>
              </div>

              <p style={{
                fontSize: '1.05rem',
                lineHeight: 1.7,
                color: 'rgba(241, 245, 249, 0.9)',
                marginBottom: '1.75rem'
              }}>
                {movie.synopsis}
              </p>

              {/* Cast & Director */}
              <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--gold-light)', fontWeight: '700', fontSize: '0.85rem' }}>DIRECTOR: </span>
                  <span style={{ color: '#fff', fontWeight: '500' }}>{movie.director}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--gold-light)', fontWeight: '700', fontSize: '0.85rem' }}>STARRING CAST: </span>
                  <span style={{ color: 'var(--text-primary)' }}>{movie.cast_list}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SHOWTIMES & TICKETING SECTION */}
      <div className="container" style={{ padding: '3rem 0 5rem 0' }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">Select Date & Showtime</h2>
            <p className="section-subtitle">Choose your preferred cinema location, auditorium format, and time</p>
          </div>

          {/* Cinema Filter */}
          <div style={{ minWidth: '220px' }}>
            <div className="filter-input-wrap">
              <MapPin size={15} color="var(--gold-primary)" />
              <select 
                className="filter-select"
                value={selectedCinemaId}
                onChange={(e) => setSelectedCinemaId(e.target.value)}
              >
                <option value="">All Cinema Locations</option>
                {Array.from(new Set((movie.showtimes || []).map(s => JSON.stringify({ id: s.cinema_id, name: s.cinema_name }))))
                  .map(str => JSON.parse(str))
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                }
              </select>
            </div>
          </div>
        </div>

        {/* Date Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          overflowX: 'auto',
          paddingBottom: '1rem',
          marginBottom: '2.5rem'
        }}>
          {dates.map((d, index) => (
            <button
              key={d.dateStr}
              onClick={() => setSelectedDateIndex(index)}
              className="glass-card"
              style={{
                padding: '0.85rem 1.4rem',
                textAlign: 'center',
                minWidth: '100px',
                cursor: 'pointer',
                borderColor: selectedDateIndex === index ? 'var(--gold-primary)' : 'var(--border-subtle)',
                background: selectedDateIndex === index ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card)',
                transform: selectedDateIndex === index ? 'translateY(-2px)' : 'none',
                boxShadow: selectedDateIndex === index ? 'var(--shadow-gold)' : 'none'
              }}
            >
              <div style={{
                fontSize: '0.8rem',
                fontWeight: '700',
                color: selectedDateIndex === index ? 'var(--gold-light)' : 'var(--text-muted)',
                textTransform: 'uppercase'
              }}>
                {d.dayName}
              </div>
              <div style={{
                fontSize: '1.05rem',
                fontWeight: '800',
                color: selectedDateIndex === index ? '#fff' : 'var(--text-secondary)'
              }}>
                {d.dateFormatted}
              </div>
            </button>
          ))}
        </div>

        {/* Showtimes List */}
        {Object.keys(groupedByCinema).length === 0 ? (
          <div className="glass-card" style={{ padding: '3.5rem', textAlign: 'center' }}>
            <Calendar size={36} color="var(--gold-primary)" style={{ opacity: 0.8, marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Showtimes Available</h3>
            <p style={{ maxWidth: '450px', margin: '0 auto' }}>
              There are no scheduled showtimes for {currentDateObj?.dayName} ({currentDateObj?.dateFormatted}) at the selected cinema. Please choose another date or cinema.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {Object.entries(groupedByCinema).map(([cinemaName, group]) => (
              <div key={cinemaName} className="glass-card" style={{ padding: '2rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '1rem',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <MapPin size={20} color="var(--gold-primary)" />
                    <h3 style={{ fontSize: '1.3rem', fontWeight: '800' }}>{cinemaName}</h3>
                    <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>{group.cinemaCity}</span>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '1.25rem'
                }}>
                  {group.showtimes.map(st => {
                    const timeOnly = st.start_time.split(' ')[1] || st.start_time;
                    return (
                      <div
                        key={st.id}
                        className="glass-card glass-card-hover"
                        onClick={() => onSelectShowtime(st.id, movie)}
                        style={{
                          padding: '1.25rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem',
                          background: 'rgba(14, 17, 26, 0.9)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>
                            {timeOnly}
                          </span>
                          <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                            {st.hall_type || '2D'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {st.hall_name}
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 'auto',
                          paddingTop: '0.6rem',
                          borderTop: '1px solid rgba(255,255,255,0.06)'
                        }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>From</span>
                          <span style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--gold-light)' }}>
                            ${st.base_price ? st.base_price.toFixed(2) : '16.50'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. REVIEWS & AUDIENCE RATINGS */}
        {movie.reviews && movie.reviews.length > 0 && (
          <section style={{ marginTop: '4rem' }}>
            <div className="section-header">
              <h2 className="section-title">Audience & Critic Reviews</h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {movie.reviews.map(r => (
                <div key={r.id} className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%',
                        background: 'rgba(245, 158, 11, 0.2)', border: '1px solid var(--gold-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-light)', fontWeight: '700'
                      }}>
                        {r.user_name?.charAt(0)}
                      </div>
                      <span style={{ fontWeight: '700', color: '#fff' }}>{r.user_name}</span>
                    </div>

                    <div className="movie-score-badge">
                      <Star size={12} fill="currentColor" color="var(--gold-primary)" />
                      <span>{r.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    "{r.comment}"
                  </p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.75rem' }}>
                    Verified Ticket Holder • {r.date}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
