import React from 'react';
import '../css/busCard.css';

// A single card component for a bus item
const BusCard = ({ busNo, driverName, source, destination, hour, minutes }) => {
  return (
    <div className="bus-card">
      {/* Left section: Bus no. and driver name */}
      <div className="card-left">
        <div className="bus-no">{busNo}</div>
        <div className="driver-name">{driverName}</div>
      </div>
      
      {/* Middle section: Source arrow destination */}
      <div className="card-middle">
        <span className="source">{source}</span>
        <span className="arrow">&#8594;</span>
        <span className="destination">{destination}</span>
      </div>
      
      {/* Right section: Time (minutes and seconds) */}
      <div className="card-right">
        <div className="time">
          {hour} : {minutes}
        </div>
      </div>
    </div>
  );
};

// Component to render multiple bus cards in a list
const BusSchedule = ({ busData = [] }) => {
  return (
    <div className="bus-card-list">
      {busData.map((bus, index) => (
        <BusCard
          key={index}
          busNo={bus.busNo}
          driverName={bus.driverName}
          source={bus.source}
          destination={bus.destination}
          hour={bus.hour}
          minutes={bus.minutes}
        />
      ))}
    </div>
  );
};

export default BusSchedule;
