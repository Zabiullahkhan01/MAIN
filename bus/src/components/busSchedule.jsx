import React, { useState, useEffect } from 'react';
import '../css/busCard.css';

const BusCard = ({
  busId,
  driverName,
  conductorName,
  sourceName,
  destinationName,
  shiftTime,
  available,
  alertMessage // optional: you can show the alert message if needed
}) => {
  return (
    <div
      className={`bus-card ${available === "No" ? "cancelled" : ""}`}
      style={{ opacity: available === "No" ? 0.5 : 1 }}
    >
      <div className="card-left">
        <div className="bus-no">{busId}</div>
        <div className="driver-name">{driverName}</div>
        <div className="conductor-name">{conductorName}</div>
      </div>

      <div className="card-middle">
        <span className="source">{sourceName}</span>
        <span className="arrow">&#8594;</span>
        <span className="destination">{destinationName}</span>
      </div>

      <div className="card-right">

      {available === "No" && (
        <div className="cancelled-label">
          Cancelled {alertMessage && `- ${alertMessage}`}
        </div>
      )}

<div className="time">{shiftTime}</div>
      </div>
    </div>
  );
};

const BusSchedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch schedule data
        const scheduleResponse = await fetch('http://localhost:4000/api/schedule');
        // Fetch alerts data
        const alertsResponse = await fetch('http://localhost:4000/api/alerts');
        
        if (!scheduleResponse.ok || !alertsResponse.ok) {
          throw new Error("Failed to fetch schedule or alerts data");
        }
        
        const scheduleData = await scheduleResponse.json();
        const alertsData = await alertsResponse.json();
        
        setSchedule(scheduleData.schedule);
        // Assuming your alerts data is in an array called "alerts"
        setAlerts(alertsData.alerts);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading schedule...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="bus-card-list">
      <h1>Bus Schedule</h1>
      {schedule.map((bus, index) => {
        // Check if this bus id is present in the alerts list.
        const alertForBus = alerts.find(alert => alert.busNo === bus.bus_id);
        const isCancelled = !!alertForBus;
        return (
          <BusCard
            key={index}
            busId={bus.bus_id}
            driverName={bus.driver_name}
            conductorName={bus.conductor_name}
            sourceName={bus.source_name}
            destinationName={bus.destination_name}
            shiftTime={bus.shift_time}
            available={isCancelled ? "No" : "Yes"}
            alertMessage={isCancelled ? alertForBus.message : ""}
          />
        );
      })}
    </div>
  );
};

export default BusSchedule;
