import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Sparkles, Film, ArrowRight, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export default function CinemasPage({ onSelectShowtime, onSelectMovie, navigate }) {
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('All');
  const [expandedCinemaId, setExpandedCinemaId] = useState(null);
  const [cinemaDetails, setCinemaDetails] = useState({});

  useEffect(() => {
    loadCinemas();
  }, []);

  async function loadCinemas() {
    try {
      setLoading(true);
      const data = await api.getCinemas();
      setCinemas(data);
      if (data.length > 0) {
        toggleExpand(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load cinemas:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(cinemaId) {
    if (expandedCinemaId === cinemaId) {
      setExpandedCinemaId(null);
      return;
    }
    setExpandedCinemaId(cinemaId);

    if (!cinemaDetails[cinemaId]) {
      try {
        const details = await api.getCinema(cinemaId);
        setCinemaDetails(prev => ({ ...prev, [cinemaId]: details }));
      } catch (e) {
        console.error('Failed to load cinema schedule:', e);
      }
    }
  }

  const cities = ['All', ...new Set(cinemas.map(c => c.city))];
  const filteredCinemas = selectedCity === 'All' 
    ? cinemas 
    : cinemas.filter(c => c.city === selectedCity);

  return (
    <div className="cinemas-page container" style={{ padding: '3rem 1.5rem 5rem 1.5rem' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">Our Cinema Locations & Theaters</h1>
          <p className="section-subtitle">
            Explore world-class auditoriums featuring IMAX Laser, Dolby Cinema, 4DX Motion, and VIP lounges
          </p>
        </div>

        {/* City Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {cities.map(city => (
            <button
              key={city}
              className={`genre-pill ${selectedCity === city ? 'active' : ''}`}
              onClick={() => setSelectedCity(city)}
            >
              {city === 'All' ? 'All Cities' : city}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading cinema theaters...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {filteredCinemas.map(cinema => {
            const isExpanded = expandedCinemaId === cinema.id;
            const details = cinemaDetails[cinema.id];
            const amenitiesList = (cinema.amenities || '').split(',').map(a => a.trim()).filter(Boolean);

            return (
              <div key={cinema.id} className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '2rem',
                  padding: '2rem'
                }}>
                  {/* Cinema Image */}
                  <div style={{
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    height: '240px',
                    position: 'relative'
                  }}>
                    <img 
                      src={cinema.image_url} 
                      alt={cinema.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px'
                    }}>
                      <span className="badge badge-gold">{cinema.city}</span>
                    </div>
                  </div>

                  {/* Cinema Details */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '0.75rem' }}>
                      {cinema.name}
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        <MapPin size={16} color="var(--gold-primary)" style={{ flexShrink: 0, marginTop: '3px' }} />
                        <span>{cinema.address}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        <Phone size={15} color="var(--cyan-neon)" />
                        <span>{cinema.phone}</span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                      {cinema.description}
                    </p>

                    {/* Amenities Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: 'auto', marginBottom: '1.25rem' }}>
                      {amenitiesList.map((amenity, i) => (
                        <span key={i} className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                          <CheckCircle size={10} /> {amenity}
                        </span>
                      ))}
                    </div>

                    <div>
                      <button 
                        className={`btn ${isExpanded ? 'btn-outline-gold' : 'btn-primary'} btn-sm`}
                        onClick={() => toggleExpand(cinema.id)}
                      >
                        {isExpanded ? 'Hide Showtimes' : 'View Available Movies & Showtimes'}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Showtimes Schedule */}
                {isExpanded && (
                  <div style={{
                    background: 'rgba(9, 11, 16, 0.95)',
                    borderTop: '1px solid var(--border-subtle)',
                    padding: '2rem'
                  }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1.25rem', color: 'var(--gold-light)' }}>
                      Now Playing at {cinema.name}
                    </h3>

                    {!details ? (
                      <div style={{ color: 'var(--text-muted)' }}>Loading showtimes...</div>
                    ) : (details.showtimes || []).length === 0 ? (
                      <div style={{ color: 'var(--text-muted)' }}>No showtimes currently scheduled.</div>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: '1rem'
                      }}>
                        {details.showtimes.map(st => {
                          const time = st.start_time.split(' ')[1] || st.start_time;
                          const date = st.start_time.split(' ')[0];
                          return (
                            <div 
                              key={st.id}
                              className="glass-card glass-card-hover"
                              onClick={() => onSelectShowtime(st.id, { id: st.movie_id, title: st.movie_title, poster_url: st.poster_url })}
                              style={{
                                padding: '1rem',
                                cursor: 'pointer',
                                background: 'rgba(22, 26, 38, 0.9)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.4rem'
                              }}
                            >
                              <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.95rem' }}>
                                {st.movie_title}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--gold-light)' }}>
                                  {time}
                                </span>
                                <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                                  {st.hall_type}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {date} • {st.hall_name}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
