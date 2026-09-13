import React from 'react';
import { Star, Clock, Play, Ticket } from 'lucide-react';

export default function MovieCard({ movie, onSelect, onWatchTrailer }) {
  const isComingSoon = movie.is_coming_soon === 1;

  return (
    <div className="movie-card">
      <div className="movie-poster-wrap">
        <img 
          src={movie.poster_url} 
          alt={movie.title} 
          className="movie-poster"
          loading="lazy"
        />
        <div className="movie-poster-overlay" />

        {/* Floating Badges */}
        <div className="movie-badges-floating">
          <span className="badge badge-gold">
            {movie.rating || 'PG-13'}
          </span>
          <div className="movie-score-badge">
            <Star size={13} fill="currentColor" color="var(--gold-primary)" />
            <span>{movie.imdb_score ? movie.imdb_score.toFixed(1) : '8.5'}</span>
          </div>
        </div>

        {/* Quick Trailer Button Overlay */}
        {movie.trailer_url && (
          <button 
            className="btn btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              onWatchTrailer(movie);
            }}
            title="Watch Official Trailer"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              padding: 0,
              opacity: 0,
              transition: 'all var(--transition-bounce)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'; }}
          >
            <Play size={20} fill="#000" color="#000" style={{ marginLeft: '3px' }} />
          </button>
        )}
      </div>

      <div className="movie-info">
        <h3 className="movie-title" title={movie.title}>
          {movie.title}
        </h3>

        <div className="movie-genre-list">
          {movie.genre}
        </div>

        <div className="movie-meta-strip">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={13} />
            <span>{movie.duration_mins} mins</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>{movie.language}</span>
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${isComingSoon ? 'btn-outline' : 'btn-primary'} btn-sm`}
            style={{ flex: 1 }}
            onClick={() => onSelect(movie)}
          >
            <Ticket size={15} />
            {isComingSoon ? 'View Details' : 'Book Tickets'}
          </button>
          
          {movie.trailer_url && (
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => onWatchTrailer(movie)}
              title="Watch Trailer"
              style={{ padding: '0.45rem' }}
            >
              <Play size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
