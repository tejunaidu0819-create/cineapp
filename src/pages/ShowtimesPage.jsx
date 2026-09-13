import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Film, Sparkles, SlidersHorizontal, ArrowRight, RotateCcw } from 'lucide-react';
import { api } from '../services/api';

const FORMATS = ['All', 'IMAX', 'Dolby', 'VIP', '4DX', 'Standard'];

export default function ShowtimesPage({ onSelectShowtime, onSelectMovie }) {
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedCinemaId, setSelectedCinemaId] = useState('');
  const [selectedMovieId, setSelectedMovieId] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('All');

  // Dates
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateFormatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  });

  const currentDateStr = dates[selectedDateIndex]?.dateStr;

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadShowtimes();
  }, [selectedDateIndex, selectedCinemaId, selectedMovieId, selectedFormat]);

  async function loadFilters() {
    try {
      const [mList, cList] = await Promise.all([
        api.getMovies({ comingSoon: 'false' }),
        api.getCinemas()
      ]);
      setMovies(mList);
      setCinemas(cList);
    } catch (e) {
      console.error('Failed to load filters:', e);
    }
  }

  async function loadShowtimes() {
    try {
      setLoading(true);
      const data = await api.getShowtimes({
        date: currentDateStr,
        cinemaId: selectedCinemaId,
        movieId: selectedMovieId,
        format: selectedFormat !== 'All' ? selectedFormat : ''
      });
      setShowtimes(data);
    } catch (e) {
      console.error('Failed to load showtimes:', e);
    } finally {
      setLoading(false);
    }
  }

  // Group showtimes by Movie
  const groupedByMovie = {};
  for (const st of showtimes) {
    if (!groupedByMovie[st.movie_id]) {
      groupedByMovie[st.movie_id] = {
        movieTitle: st.movie_title,
        posterUrl: st.poster_url,
        genre: st.genre,
        durationMins: st.duration_mins,
        movieRating: st.movie_rating,
        slots: []
      };
    }
    groupedByMovie[st.movie_id].slots.push(st);
  }

  const resetFilters = () => {
    setSelectedDateIndex(0);
    setSelectedCinemaId('');
    setSelectedMovieId('');
    setSelectedFormat('All');
  };

  return (
    <div className="showtimes-page container" style={{ padding: '3rem 1.5rem 5rem 1.5rem' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">Cinema Schedules & Showtimes</h1>
          <p className="section-subtitle">Browse all upcoming screenings, formats, and available seats</p>
        </div>
      </div>

      {/* Date Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        overflowX: 'auto',
        paddingBottom: '1rem',
        marginBottom: '2rem'
      }}>
        {dates.map((d, index) => (
          <button
            key={d.dateStr}
            onClick={() => setSelectedDateIndex(index)}
            className="glass-card"
            style={{
              padding: '0.75rem 1.25rem',
              textAlign: 'center',
              minWidth: '100px',
              cursor: 'pointer',
              borderColor: selectedDateIndex === index ? 'var(--gold-primary)' : 'var(--border-subtle)',
              background: selectedDateIndex === index ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card)',
              boxShadow: selectedDateIndex === index ? 'var(--shadow-gold)' : 'none'
            }}
          >
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              color: selectedDateIndex === index ? 'var(--gold-light)' : 'var(--text-muted)',
              textTransform: 'uppercase'
            }}>
              {d.dayName}
            </div>
            <div style={{
              fontSize: '1rem',
              fontWeight: '800',
              color: selectedDateIndex === index ? '#fff' : 'var(--text-secondary)'
            }}>
              {d.dateFormatted}
            </div>
          </button>
        ))}
      </div>

      {/* Filter Control Bar */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'center'
        }}>
          {/* Cinema Filter */}
          <div className="filter-group">
            <span className="filter-label"><MapPin size={12} /> Cinema Location</span>
            <div className="filter-input-wrap">
              <select
                className="filter-select"
                value={selectedCinemaId}
                onChange={(e) => setSelectedCinemaId(e.target.value)}
              >
                <option value="">All Cinemas</option>
                {cinemas.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Movie Filter */}
          <div className="filter-group">
            <span className="filter-label"><Film size={12} /> Movie</span>
            <div className="filter-input-wrap">
              <select
                className="filter-select"
                value={selectedMovieId}
                onChange={(e) => setSelectedMovieId(e.target.value)}
              >
                <option value="">All Movies</option>
                {movies.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Format Filter */}
          <div className="filter-group">
            <span className="filter-label"><Sparkles size={12} /> Format & Sound</span>
            <div className="filter-input-wrap">
              <select
                className="filter-select"
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
              >
                {FORMATS.map(f => (
                  <option key={f} value={f}>{f === 'All' ? 'All Screen Formats' : f}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset */}
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
            <button className="btn btn-outline btn-sm" onClick={resetFilters} style={{ width: '100%', height: '42px' }}>
              <RotateCcw size={14} /> Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Showtimes Results Grouped by Movie */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading schedule...
        </div>
      ) : Object.keys(groupedByMovie).length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <Calendar size={40} color="var(--gold-primary)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Screenings Found</h3>
          <p style={{ maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
            No showtimes match the selected filters on this date. Try selecting another date or cinema.
          </p>
          <button className="btn btn-outline-gold" onClick={resetFilters}>
            <RotateCcw size={15} /> Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {Object.entries(groupedByMovie).map(([movieId, movieGroup]) => (
            <div key={movieId} className="glass-card" style={{ padding: '2rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '1.5rem',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <img 
                  src={movieGroup.posterUrl} 
                  alt={movieGroup.movieTitle}
                  style={{
                    width: '64px',
                    height: '92px',
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-md)'
                  }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>{movieGroup.movieTitle}</h2>
                    <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>{movieGroup.movieRating}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {movieGroup.genre} • {movieGroup.durationMins} mins
                  </div>
                </div>
              </div>

              {/* Showtime Slot Pills */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '1rem'
              }}>
                {movieGroup.slots.map(st => {
                  const time = st.start_time.split(' ')[1] || st.start_time;
                  return (
                    <div
                      key={st.id}
                      className="glass-card glass-card-hover"
                      onClick={() => onSelectShowtime(st.id, { id: st.movie_id, title: st.movie_title, poster_url: st.poster_url })}
                      style={{
                        padding: '1.1rem',
                        cursor: 'pointer',
                        background: 'rgba(14, 17, 26, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>
                          {time}
                        </span>
                        <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                          {st.hall_type}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--gold-light)', fontWeight: '600' }}>
                        {st.cinema_name}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {st.hall_name}
                      </div>

                      <div style={{
                        marginTop: '0.75rem',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-white)' }}>
                          ${st.base_price.toFixed(2)}
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
    </div>
  );
}
