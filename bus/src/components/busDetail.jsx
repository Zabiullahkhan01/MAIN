import React, { useState, useEffect } from 'react';
import '../css/busDetail.css';

function BusDetail() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all buses from the backend API when the component mounts.
  useEffect(() => {
    fetch('http://localhost:4000/api/buses')
      .then(response => response.json())
      .then(data => {
        setBuses(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching buses:', error);
        setLoading(false);
      });
  }, []);

  // Function to update bus availability.
  const updateAvailability = (busId, availability) => {
    fetch('http://localhost:4000/api/updateAvailability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bus_id: busId, available: availability })
    })
      .then(response => response.json())
      .then(() => {
        // Update the local state to reflect the new availability.
        setBuses(prevBuses =>
          prevBuses.map(bus =>
            bus.bus_id === busId ? { ...bus, available: availability } : bus
          )
        );
      })
      .catch(error => {
        console.error('Error updating availability:', error);
      });
  };

  if (loading) {
    return <div className="loading">Loading buses...</div>;
  }

  return (
    <div className="container">
      <h1 className="heading">Bus Availability</h1>
      <div className="bus-cards">
        {buses.map(bus => (
          <div key={bus.bus_id} className="buscard">
            <h3>Bus ID: {bus.bus_id}</h3>
            <p className={bus.available === 'Yes' ? 'available' : 'unavailable'}>
              Status: {bus.available === 'Yes' ? 'Available' : 'Unavailable'}
            </p>
            {bus.available === 'Yes' ? (
              <button
                onClick={() => updateAvailability(bus.bus_id, 'No')}
                className="button-unavailable"
              >
                Mark as Unavailable
              </button>
            ) : (
              <button
                onClick={() => updateAvailability(bus.bus_id, 'Yes')}
                className="button-undo"
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BusDetail;
