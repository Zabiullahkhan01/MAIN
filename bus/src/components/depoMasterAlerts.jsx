import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import AlertCard from './alertCard.jsx';
import '../css/depoMasterAlerts.css';

const DepoMasterAlerts = () => {
  // State for all alerts fetched from the backend.
  const [alerts, setAlerts] = useState([]);
  // State for current time used for "time ago" calculations.
  const [currentTime, setCurrentTime] = useState(new Date());
  // State for storing IDs of alerts that have been marked as read.
  // This state is initialized from localStorage so users' read status persists.
  const [readAlerts, setReadAlerts] = useState(() => {
    const stored = localStorage.getItem('readAlerts');
    return stored ? JSON.parse(stored) : [];
  });
  // Ref to store the previous unread count.
  const prevUnreadCountRef = useRef(0);

  // Update localStorage whenever readAlerts state changes.
  useEffect(() => {
    localStorage.setItem('readAlerts', JSON.stringify(readAlerts));
  }, [readAlerts]);

  // Function to fetch alerts from the backend.
  // It also enhances each alert with an "isRead" property based on our readAlerts state.
  const fetchAlerts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/alerts');
      // Filter alerts to include only those created today.
      const todayAlerts = response.data.filter((alert) => {
        const alertDate = new Date(alert.time);
        return alertDate.toDateString() === new Date().toDateString();
      });
      // Map each alert to include an isRead flag if its id is in the readAlerts array.
      const enhancedAlerts = todayAlerts.map((alert) => ({
        ...alert,
        isRead: readAlerts.includes(alert.id),
      }));
      setAlerts(enhancedAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  // On mount, fetch alerts and set up intervals.
  useEffect(() => {
    fetchAlerts();
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    const alertsInterval = setInterval(fetchAlerts, 60000);
    return () => {
      clearInterval(timeInterval);
      clearInterval(alertsInterval);
    };
  }, [readAlerts]);

  // Removed the sound notification useEffect.

  // When an alert is clicked in AlertCard, call this function to mark it as read.
  // It adds the alert's id to the readAlerts array and updates the local alerts state.
  const markAlertAsRead = useCallback((id) => {
    if (!readAlerts.includes(id)) {
      setReadAlerts((prev) => [...prev, id]);
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === id ? { ...alert, isRead: true } : alert
        )
      );
      // Optionally, you can send an API request to mark the alert as read in the database.
    }
  }, [readAlerts]);

  // Remove an alert from the UI.
  const removeAlert = (id) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    // Optionally, remove it on the backend as well.
  };

  // Helper function to compute how much time has passed since the alert was created.
  const timeAgo = (alertTime) => {
    const alertDate = new Date(alertTime);
    const diffInSeconds = Math.floor((currentTime - alertDate) / 1000);
    if (isNaN(diffInSeconds)) return 'Invalid time';
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      const minutes = Math.floor((diffInSeconds % 3600) / 60);
      return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }
  };

  // Count unread alerts for display purposes.
  const unreadCount = alerts.filter((alert) => !alert.isRead).length;

  return (
    <div className="depomaster-alerts">
      <h1>Emergency Alerts</h1>
      <div className="alert-summary">
        {unreadCount > 0
          ? `${unreadCount} new alert${unreadCount > 1 ? 's' : ''}`
          : 'All alerts read'}
      </div>
      {/* Render each alert by passing its data and the corresponding callbacks */}
      {alerts.map((alert) => (
        <AlertCard 
          key={alert.id} 
          alert={alert} 
          timeAgo={timeAgo} 
          removeAlert={removeAlert}
          markAsRead={() => markAlertAsRead(alert.id)}
        />
      ))}
    </div>
  );
};

export default DepoMasterAlerts;
