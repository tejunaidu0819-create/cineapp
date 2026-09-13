import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Toast from './components/Toast';
import TrailerModal from './components/TrailerModal';

import HomePage from './pages/HomePage';
import MovieDetailsPage from './pages/MovieDetailsPage';
import CinemasPage from './pages/CinemasPage';
import ShowtimesPage from './pages/ShowtimesPage';
import SeatSelectionPage from './pages/SeatSelectionPage';
import CheckoutPage from './pages/CheckoutPage';
import TicketPage from './pages/TicketPage';
import BookingsPage from './pages/BookingsPage';
import AuthPage from './pages/AuthPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState(null);
  const [bookingDraft, setBookingDraft] = useState(null);
  const [activeBookingRef, setActiveBookingRef] = useState(null);
  const [activeBookingEmail, setActiveBookingEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [trailerModal, setTrailerModal] = useState(null);
  const [toast, setToast] = useState(null);

  // Persistent User Auth
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cineverse_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('cineverse_user', JSON.stringify(user));
    } catch (e) {}
    setCurrentView('home');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('cineverse_user');
    } catch (e) {}
    showToast('Signed out successfully.', 'info');
    setCurrentView('home');
  };

  const handleSelectMovie = (movie) => {
    setSelectedMovieId(movie.id);
    setCurrentView('movie-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectShowtime = (showtimeId, movieInfo) => {
    setSelectedShowtimeId(showtimeId);
    setCurrentView('seat-selection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToCheckout = (draft) => {
    setBookingDraft(draft);
    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookingSuccess = (reference, email) => {
    setActiveBookingRef(reference);
    setActiveBookingEmail(email);
    setCurrentView('ticket');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewTicket = (reference, email) => {
    setActiveBookingRef(reference);
    setActiveBookingEmail(email || '');
    setCurrentView('ticket');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWatchTrailer = (movie) => {
    if (movie.trailer_url) {
      setTrailerModal({ url: movie.trailer_url, title: movie.title });
    } else {
      showToast('Trailer preview is not available for this movie.', 'warning');
    }
  };

  return (
    <div className="app-container">
      {/* Toast Notification Alert */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Trailer Video Player Popup */}
      <TrailerModal 
        trailer={trailerModal} 
        onClose={() => setTrailerModal(null)} 
      />

      {/* Main Top Navigation */}
      <Navbar 
        currentView={currentView}
        navigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSearch={(query) => {
          setSearchQuery(query);
          setCurrentView('home');
        }}
      />

      {/* Active Page View */}
      <main className="main-content">
        {currentView === 'home' && (
          <HomePage 
            onSelectMovie={handleSelectMovie}
            onWatchTrailer={handleWatchTrailer}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            navigate={(view) => {
              setCurrentView(view);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'movie-details' && (
          <MovieDetailsPage 
            movieId={selectedMovieId}
            onBack={() => setCurrentView('home')}
            onSelectShowtime={handleSelectShowtime}
            onWatchTrailer={handleWatchTrailer}
          />
        )}

        {currentView === 'cinemas' && (
          <CinemasPage 
            onSelectShowtime={handleSelectShowtime}
            onSelectMovie={handleSelectMovie}
            navigate={setCurrentView}
          />
        )}

        {currentView === 'showtimes' && (
          <ShowtimesPage 
            onSelectShowtime={handleSelectShowtime}
            onSelectMovie={handleSelectMovie}
          />
        )}

        {currentView === 'seat-selection' && (
          <SeatSelectionPage 
            showtimeId={selectedShowtimeId}
            onBack={() => {
              if (selectedMovieId) {
                setCurrentView('movie-details');
              } else {
                setCurrentView('showtimes');
              }
            }}
            onProceedToCheckout={handleProceedToCheckout}
            showToast={showToast}
          />
        )}

        {currentView === 'checkout' && (
          <CheckoutPage 
            bookingDraft={bookingDraft}
            currentUser={currentUser}
            onBack={() => setCurrentView('seat-selection')}
            onBookingSuccess={handleBookingSuccess}
            showToast={showToast}
          />
        )}

        {currentView === 'ticket' && (
          <TicketPage 
            bookingReference={activeBookingRef}
            userEmail={activeBookingEmail}
            onBackToHome={() => setCurrentView('home')}
            onViewBookings={() => setCurrentView('bookings')}
            showToast={showToast}
          />
        )}

        {currentView === 'bookings' && (
          <BookingsPage 
            currentUser={currentUser}
            onViewTicket={handleViewTicket}
            navigate={(view) => {
              setCurrentView(view);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            showToast={showToast}
          />
        )}

        {currentView === 'auth' && (
          <AuthPage 
            onLoginSuccess={handleLoginSuccess}
            onBack={() => setCurrentView('home')}
            showToast={showToast}
          />
        )}

        {currentView === 'admin' && (
          <AdminPage 
            currentUser={currentUser}
            navigate={setCurrentView}
            showToast={showToast}
          />
        )}
      </main>

      {/* Luxury Footer */}
      <Footer navigate={(view) => {
        setCurrentView(view);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }} />
    </div>
  );
}
