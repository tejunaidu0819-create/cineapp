import React, { useState } from 'react';
import { 
  Film, 
  MapPin, 
  Calendar, 
  Ticket, 
  ShieldCheck, 
  User, 
  LogOut, 
  Search, 
  Menu, 
  X,
  Sparkles,
  Coins
} from 'lucide-react';

export default function Navbar({ 
  currentView, 
  navigate, 
  currentUser, 
  onLogout,
  onSearch 
}) {
  const [searchInput, setSearchInput] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchInput);
      navigate('home');
    }
  };

  return (
    <>
      <header className="navbar">
        <div className="container nav-container">
          {/* Brand Logo */}
          <a 
            href="#home" 
            className="brand-logo"
            onClick={(e) => { e.preventDefault(); navigate('home'); }}
          >
            <div className="brand-icon">
              <Film size={22} />
            </div>
            <div className="brand-name">
              CINE<span>VERSE</span>
            </div>
          </a>

          {/* Quick Search */}
          <form className="nav-search-form" onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center' }}>
            <div className="filter-input-wrap" style={{ width: '280px', padding: '0.45rem 0.75rem' }}>
              <Search size={16} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Search movies, cast, director..." 
                className="filter-input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </form>

          {/* Desktop Nav Links */}
          <ul className="nav-links">
            <li>
              <a 
                href="#movies" 
                className={`nav-link ${currentView === 'home' || currentView === 'movies' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); navigate('home'); }}
              >
                Movies
              </a>
            </li>
            <li>
              <a 
                href="#cinemas" 
                className={`nav-link ${currentView === 'cinemas' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); navigate('cinemas'); }}
              >
                Cinemas
              </a>
            </li>
            <li>
              <a 
                href="#showtimes" 
                className={`nav-link ${currentView === 'showtimes' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); navigate('showtimes'); }}
              >
                Showtimes
              </a>
            </li>
            <li>
              <a 
                href="#bookings" 
                className={`nav-link ${currentView === 'bookings' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); navigate('bookings'); }}
              >
                My Bookings
              </a>
            </li>
            {currentUser?.role === 'admin' && (
              <li>
                <a 
                  href="#admin" 
                  className={`nav-link ${currentView === 'admin' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); navigate('admin'); }}
                  style={{ color: 'var(--cyan-neon)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <ShieldCheck size={16} />
                  Admin
                </a>
              </li>
            )}
          </ul>

          {/* User Profile / Auth State */}
          <div className="nav-actions">
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div 
                  className="badge badge-gold" 
                  title="Reward Points"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.6rem' }}
                >
                  <Coins size={14} />
                  <span>{currentUser.points || 0} pts</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate('bookings')}
                    style={{ borderRadius: 'var(--radius-full)', padding: '0.4rem 0.9rem' }}
                  >
                    <User size={15} color="var(--gold-primary)" />
                    <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentUser.full_name?.split(' ')[0] || 'Profile'}
                    </span>
                  </button>

                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={onLogout}
                    title="Sign Out"
                    style={{ padding: '0.4rem' }}
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => navigate('auth')}
              >
                <User size={16} />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-nav">
        <button 
          className={`mobile-nav-item ${currentView === 'home' ? 'active' : ''}`}
          onClick={() => navigate('home')}
        >
          <Film size={20} />
          <span>Movies</span>
        </button>

        <button 
          className={`mobile-nav-item ${currentView === 'cinemas' ? 'active' : ''}`}
          onClick={() => navigate('cinemas')}
        >
          <MapPin size={20} />
          <span>Cinemas</span>
        </button>

        <button 
          className={`mobile-nav-item ${currentView === 'showtimes' ? 'active' : ''}`}
          onClick={() => navigate('showtimes')}
        >
          <Calendar size={20} />
          <span>Schedule</span>
        </button>

        <button 
          className={`mobile-nav-item ${currentView === 'bookings' ? 'active' : ''}`}
          onClick={() => navigate('bookings')}
        >
          <Ticket size={20} />
          <span>Tickets</span>
        </button>

        <button 
          className={`mobile-nav-item ${currentView === 'auth' || currentView === 'admin' ? 'active' : ''}`}
          onClick={() => currentUser?.role === 'admin' ? navigate('admin') : (currentUser ? navigate('bookings') : navigate('auth'))}
        >
          {currentUser?.role === 'admin' ? <ShieldCheck size={20} /> : <User size={20} />}
          <span>{currentUser?.role === 'admin' ? 'Admin' : (currentUser ? 'Account' : 'Login')}</span>
        </button>
      </nav>
    </>
  );
}
