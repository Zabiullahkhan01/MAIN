import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AlertCard from './AlertCard';
import '../css/depoMasterAlerts.css';

const DepoMasterAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Function to fetch alerts from the backend.
    const fetchAlerts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/alerts');
        // Filter alerts to include only those from today
        const todayAlerts = response.data.filter(alert => {
          const alertDate = new Date(alert.time);
          return alertDate.toDateString() === new Date().toDateString();
        });
        setAlerts(todayAlerts);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };

    // Fetch alerts on mount.
    fetchAlerts();

    // Refresh alerts every minute.
    const alertsInterval = setInterval(fetchAlerts, 60000);

    // Update the current time every second.
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Clean up intervals on unmount.
    return () => {
      clearInterval(alertsInterval);
      clearInterval(timeInterval);
    };
  }, []);

  // Function to remove an alert from UI when the cross mark is clicked.
  const removeAlert = (id) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
  };

  // Ensure only today's alerts are shown (in case alerts state is updated externally).
  const todaysAlerts = alerts.filter(alert => {
    const alertDate = new Date(alert.time);
    return alertDate.toDateString() === currentTime.toDateString();
  });

  // Helper function to format elapsed time.
  const timeAgo = (alertTime) => {
    const alertDate = new Date(alertTime);
    const diffInSeconds = Math.floor((currentTime - alertDate) / 1000);
    
    if (isNaN(diffInSeconds)) {
      return 'Invalid time';
    }
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} second${diffInSeconds === 1 ? '' : 's'} ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      const seconds = diffInSeconds % 60;
      return `${minutes} minute${minutes === 1 ? '' : 's'} ${seconds} second${seconds === 1 ? '' : 's'} ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      const minutes = Math.floor((diffInSeconds % 3600) / 60);
      return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }
  };

  return (
    <div className="depomaster-alerts">
      <h2>Emergency Alerts</h2>
      {todaysAlerts.map((alert) => (
        <AlertCard 
          key={alert.id} 
          alert={alert} 
          timeAgo={timeAgo} 
          removeAlert={removeAlert} 
        />
      ))}
    </div>
  );
};

export default DepoMasterAlerts;
