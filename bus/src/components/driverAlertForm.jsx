import { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import '../css/driverAlertForm.css';

const DriverAlertForm = () => {
  const [busNo, setBusNo] = useState('');
  const [route, setRoute] = useState('');
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper: Capture the current date/time in IST in MySQL DATETIME format ("YYYY-MM-DD HH:mm:ss")
  const formatDateTimeIST = () => {
    // Instead of passing new Date(), we let moment() get the current moment.
    return moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
  };

  // Automatically fetch location on mount.
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          setIsLocationLoading(false);
        },
        (error) => {
          console.error('Error fetching location:', error);
          setLocationError('Unable to fetch location.');
          setIsLocationLoading(false);
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
      setIsLocationLoading(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) {
      alert('Location is not available yet.');
      return;
    }
    setIsSubmitting(true);
    
    // Capture current time in IST
    const alertData = {
      busNo,
      route,
      source,
      destination,
      message,
      location,
      time: formatDateTimeIST(),
    };

    try {
      await axios.post('http://localhost:5000/api/alerts', alertData);
      alert('Alert sent successfully!');
      // Reset form fields after submission.
      setBusNo('');
      setRoute('');
      setSource('');
      setDestination('');
      setMessage('');
    } catch (error) {
      console.error('Error sending alert:', error);
      alert('Failed to send alert. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="driver-alert-form__container">
      <form className="driver-alert-form" onSubmit={handleSubmit}>
        <h2>Send Emergency Alert</h2>
        <div className="form-group">
          <label htmlFor="busNo">Bus No:</label>
          <input
            id="busNo"
            type="text"
            value={busNo}
            onChange={(e) => setBusNo(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="route">Route:</label>
          <input
            id="route"
            type="text"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="source">Source:</label>
          <input
            id="source"
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="destination">Destination:</label>
          <input
            id="destination"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="message">Message:</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
        {locationError && <p className="error">{locationError}</p>}
        {isLocationLoading && (
          <div className="location-loading">
            <div className="spinner"></div>
            <p>Fetching location...</p>
          </div>
        )}
        {!locationError && location && !isLocationLoading && (
          <p className="location-info">
            <span className="location-icon">📍</span> Location detected: {location}
          </p>
        )}
        <button type="submit" disabled={isSubmitting || isLocationLoading}>
          {isSubmitting ? "Sending..." : "Send Alert"}
        </button>
      </form>
    </div>
  );
};

export default DriverAlertForm;