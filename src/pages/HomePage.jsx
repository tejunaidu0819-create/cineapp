import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Ticket, 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  Star, 
  Clock, 
  MapPin, 
  Calendar, 
  Globe, 
  RotateCcw,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { api } from '../services/api';
import MovieCard from '../components/MovieCard';

const GENRES = ['All', 'Sci-Fi', 'Action', 'Adventure', 'Drama', 'Animation', 'Biography', 'Comedy'];
const LANGUAGES = ['All', 'English', 'Japanese', 'Spanish', 'French'];

export default function HomePage({ 
  onSelectMovie, 
  onWatchTrailer, 
  searchQuery, 
  setSearchQuery,
  navigate 
}) {
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [selectedCinema, setSelectedCinema] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Hero carousel state
  const [heroIndex, setHeroIndex] = useState(0);

  // Generate next 7 dates for quick filter
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const val = d.toISOString().split('T')[0];
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return { val, label };
  });

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedGenre, selectedLanguage, selectedCinema, selectedDate]);

  async function loadData() {
    try {
      setLoading(true);
      const [moviesData, cinemasData] = await Promise.all([
        api.getMovies({
          search: searchQuery,
          genre: selectedGenre,
          language: selectedLanguage,
          cinemaId: selectedCinema,
          date: selectedDate
        }),
        api.getCinemas()
      ]);
      setMovies(moviesData);
      setCinemas(cinemasData);
    } catch (err) {
      console.error('Failed to load home page data:', err);
    } finally {
      setLoading(false);
    }
  }

  const trendingMovies = movies.filter(m => m.is_trending === 1 && m.is_coming_soon === 0);
  const heroMovie = trendingMovies.length > 0 ? trendingMovies[heroIndex % trendingMovies.length] : (movies[0] || null);

  const nowShowing = movies.filter(m => m.is_coming_soon === 0);
  const comingSoon = movies.filter(m => m.is_coming_soon === 1);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedGenre('All');
    setSelectedLanguage('All');
    setSelectedCinema('');
    setSelectedDate('');
  };

  const hasActiveFilters = searchQuery || selectedGenre !== 'All' || selectedLanguage !== 'All' || selectedCinema || selectedDate;

  return (
    <div className="home-page">
      {/* 1. HERO BANNER */}
      {heroMovie && (
        <section className="hero-wrapper">
          <div 
            className="hero-backdrop"
            style={{ 
              backgroundImage: `url(${heroMovie.backdrop_url || heroMovie.poster_url})`,
              filter: 'brightness(0.85)'
            }}
          />
          <div className="hero-gradient-overlay" />

          <div className="container hero-content">
            <div className="hero-tags">
              <span className="badge badge-gold">
                <Sparkles size={12} /> Now In Theaters
              </span>
              <span className="badge badge-cyan">IMAX & Dolby Atmos</span>
            </div>

            <h1 className="hero-title">
              {heroMovie.title}
            </h1>

            <div className="hero-meta">
              <div className="movie-score-badge">
                <Star size={14} fill="currentColor" color="var(--gold-primary)" />
                <span>{heroMovie.imdb_score ? heroMovie.imdb_score.toFixed(1) : '8.6'} IMDb</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={15} />
                <span>{heroMovie.duration_mins} mins</span>
              </div>
              <span>•</span>
              <span>{heroMovie.genre}</span>
              <span>•</span>
              <span>{heroMovie.language}</span>
            </div>

            <p className="hero-synopsis">
              {heroMovie.synopsis}
            </p>

            <div className="hero-cta">
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => onSelectMovie(heroMovie)}
              >
                <Ticket size={18} />
                Book Tickets Now
              </button>

              {heroMovie.trailer_url && (
                <button 
                  className="btn btn-outline btn-lg"
                  onClick={() => onWatchTrailer(heroMovie)}
                >
                  <Play size={18} />
                  Watch Trailer
                </button>
              )}
            </div>
          </div>

          {/* Carousel Controls */}
          {trendingMovies.length > 1 && (
            <div style={{
              position: 'absolute',
              bottom: '24px',
              right: '24px',
              zIndex: 10,
              display: 'flex',
              gap: '0.5rem'
            }}>
              <button 
                className="btn btn-outline btn-sm"
                style={{ borderRadius: '50%', width: '38px', height: '38px', padding: 0 }}
                onClick={() => setHeroIndex(prev => (prev - 1 + trendingMovies.length) % trendingMovies.length)}
                title="Previous Featured Movie"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                className="btn btn-outline btn-sm"
                style={{ borderRadius: '50%', width: '38px', height: '38px', padding: 0 }}
                onClick={() => setHeroIndex(prev => (prev + 1) % trendingMovies.length)}
                title="Next Featured Movie"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </section>
      )}

      <div className="container">
        {/* 2. MULTI-FILTER BAR */}
        <div className="filter-bar-container">
          <div className="filter-bar">
            {/* Search Input */}
            <div className="filter-group">
              <span className="filter-label">
                <Search size={13} /> Search Title / Cast
              </span>
              <div className="filter-input-wrap">
                <input 
                  type="text"
                  placeholder="e.g. Dune, Nolan, Timothée..."
                  className="filter-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ color: 'var(--text-muted)' }}>
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Cinema Location Selector */}
            <div className="filter-group">
              <span className="filter-label">
                <MapPin size={13} /> Cinema Location
              </span>
              <div className="filter-input-wrap">
                <select 
                  className="filter-select"
                  value={selectedCinema}
                  onChange={(e) => setSelectedCinema(e.target.value)}
                >
                  <option value="">All Cinemas</option>
                  {cinemas.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name.replace('CineVerse ', '')} ({c.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Selector */}
            <div className="filter-group">
              <span className="filter-label">
                <Calendar size={13} /> Date
              </span>
              <div className="filter-input-wrap">
                <select 
                  className="filter-select"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                >
                  <option value="">Any Date</option>
                  {dateOptions.map(d => (
                    <option key={d.val} value={d.val}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language Selector */}
            <div className="filter-group">
              <span className="filter-label">
                <Globe size={13} /> Language
              </span>
              <div className="filter-input-wrap">
                <select 
                  className="filter-select"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button 
                  className="btn btn-outline-gold btn-sm"
                  onClick={resetFilters}
                  title="Reset all filters"
                  style={{ height: '42px' }}
                >
                  <RotateCcw size={15} />
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. GENRE PILLS CAROUSEL */}
        <div className="genre-pills">
          {GENRES.map(genre => (
            <button
              key={genre}
              className={`genre-pill ${selectedGenre === genre ? 'active' : ''}`}
              onClick={() => setSelectedGenre(genre)}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* 4. NOW SHOWING MOVIES */}
        <section style={{ marginTop: '2.5rem' }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">Now Showing in Theaters</h2>
              <p className="section-subtitle">
                {hasActiveFilters 
                  ? `Showing ${nowShowing.length} movies matching your filters`
                  : 'Experience the latest Hollywood & international blockbusters on giant screens'}
              </p>
            </div>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => navigate('showtimes')}
              style={{ color: 'var(--gold-primary)' }}
            >
              View Full Schedule →
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading movies & showtimes...
            </div>
          ) : nowShowing.length === 0 ? (
            <div className="glass-card" style={{ padding: '3.5rem', textAlign: 'center' }}>
              <SlidersHorizontal size={40} color="var(--gold-primary)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>No Movies Found</h3>
              <p style={{ maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                No movies match your current search and filter criteria. Try resetting filters.
              </p>
              <button className="btn btn-outline-gold" onClick={resetFilters}>
                <RotateCcw size={16} /> Reset Filters
              </button>
            </div>
          ) : (
            <div className="movies-grid">
              {nowShowing.map(movie => (
                <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  onSelect={onSelectMovie}
                  onWatchTrailer={onWatchTrailer}
                />
              ))}
            </div>
          )}
        </section>

        {/* 5. COMING SOON SECTION */}
        {comingSoon.length > 0 && (
          <section style={{ marginTop: '2rem', marginBottom: '4rem' }}>
            <div className="section-header">
              <div>
                <h2 className="section-title">Coming Soon</h2>
                <p className="section-subtitle">Upcoming highly anticipated global theatrical releases</p>
              </div>
            </div>

            <div className="movies-grid">
              {comingSoon.map(movie => (
                <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  onSelect={onSelectMovie}
                  onWatchTrailer={onWatchTrailer}
                />
              ))}
            </div>
          </section>
        )}

        {/* 6. VIP EXPERIENCE BANNER */}
        <section className="glass-card" style={{
          padding: '3rem',
          margin: '2rem 0 5rem 0',
          background: 'linear-gradient(135deg, rgba(22, 26, 38, 0.9) 0%, rgba(139, 92, 246, 0.15) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2.5rem',
          alignItems: 'center'
        }}>
          <div>
            <span className="badge badge-purple" style={{ marginBottom: '1rem' }}>
              The Ultimate Cinema Luxe
            </span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '1rem', lineHeight: 1.2 }}>
              Elevate Your Movie Night to <span className="gold-text">First Class</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: 1.7 }}>
              Indulge in motorized zero-gravity heated recliners, gourmet artisanal chef-crafted bites, and personal waiter service at the touch of a button.
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('cinemas')}
            >
              Explore VIP Lounges
            </button>
          </div>

          <div style={{
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <img 
              src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80" 
              alt="VIP Cinema Experience"
              style={{ width: '100%', height: '260px', objectFit: 'cover' }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
