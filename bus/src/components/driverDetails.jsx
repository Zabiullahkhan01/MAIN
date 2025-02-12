import { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/driverDetail.css';

function DriverCard({ driver, onCheckIn, onCheckOut }) {
  const [checkedIn, setCheckedIn] = useState(() => {
    return localStorage.getItem(`checkedIn_${driver.driver_id}`) === 'true';
  });

  const [checkedOut, setCheckedOut] = useState(() => {
    return localStorage.getItem(`checkedOut_${driver.driver_id}`) === 'true';
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    // Remove message after 3-5 seconds
    if (message) {
      const timer = setTimeout(() => setMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleCheckInClick = () => {
    onCheckIn(driver.driver_id)
      .then(() => {
        setCheckedIn(true);
        setCheckedOut(false);
        localStorage.setItem(`checkedIn_${driver.driver_id}`, "true");
        localStorage.setItem(`checkedOut_${driver.driver_id}`, "false");
        setMessage("Check-in successful!");
      })
      .catch((err) => {
        console.error(err);
        setMessage("Error checking in");
      });
  };

  const handleCheckOutClick = () => {
    if (checkedIn && !checkedOut) {
      onCheckOut(driver.driver_id)
        .then(() => {
          setCheckedOut(true);
          localStorage.setItem(`checkedOut_${driver.driver_id}`, "true");
          setMessage("Check-out successful!");
        })
        .catch((err) => {
          console.error(err);
          setMessage("Error checking out");
        });
    }
  };

  return (
    <div className="driver-card">
      <img src={driver.picture_url} alt={driver.name} className="driver-pic" />
      <h3>{driver.name}</h3>
      <p>ID: {driver.driver_id}</p>
      <button onClick={handleCheckInClick} disabled={checkedIn}>
        {checkedIn ? "Checked In" : "Check In"}
      </button>
      <button onClick={handleCheckOutClick} disabled={!checkedIn || checkedOut}>
        {checkedOut ? "Checked Out" : "Check Out"}
      </button>
      {message && <p className="message">{message}</p>}
    </div>
  );
}

function DriverDetails() {
  const [drivers, setDrivers] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    axios.get('http://localhost:3001/api/drivers')
      .then(response => setDrivers(response.data))
      .catch(error => {
        console.error('Error fetching drivers:', error);
        setMessage('Error fetching drivers');
      });
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleCheckIn = async (driverId) => {
    try {
      const response = await axios.post('http://localhost:3001/api/attendance/checkin', { driver_id: driverId });
      setMessage(`Check-in successful for driver ${driverId}`);
      return response;
    } catch (error) {
      console.error('Error during check-in:', error);
      setMessage(error.response?.data?.error || 'Error during check-in');
      return Promise.reject(error);
    }
  };

  const handleCheckOut = async (driverId) => {
    try {
      const response = await axios.post('http://localhost:3001/api/attendance/checkout', { driver_id: driverId });
      setMessage(`Check-out successful for driver ${driverId}`);
      return response;
    } catch (error) {
      console.error('Error during check-out:', error);
      setMessage(error.response?.data?.error || 'Error during check-out');
      return Promise.reject(error);
    }
  };

  return (
    <div className="App">
      <h1>Depomaster Attendance Dashboard</h1>
      {message && <p className="message">{message}</p>}
      <div className="driver-list">
        {drivers.map(driver => (
          <DriverCard 
            key={driver.driver_id}
            driver={driver}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
          />
        ))}
      </div>
    </div>
  );
}

export default DriverDetails;





























// // const DriverDetails = () => {
// //   return (
// //     <div>
// //       <h1>Component Two</h1>
// //       <p>This is the content of Component Two.</p>
// //     </div>
// //   );
// // };

// // export default DriverDetails;
// // src/App.js
// import  { useEffect, useState } from 'react';
// import axios from 'axios';
// import '../css/driverDetail.css';

// function DriverCard({ driver, onMarkAttendance }) {
//   return (
//     <div className="driver-card">
//       <img src={driver.picture_url} alt={driver.name} className="driver-pic" />
//       <h3>{driver.name}</h3>
//       <p>ID: {driver.driver_id}</p>
//       <button onClick={() => onMarkAttendance(driver.driver_id)}>Mark Attendance</button>
//     </div>
//   );
// }

// function DriverDetails() {
//   const [drivers, setDrivers] = useState([]);
//   const [message, setMessage] = useState('');

//   useEffect(() => {
//     // Fetch the driver list from the backend.
//     axios.get('http://localhost:3001/api/drivers')
//       .then(response => setDrivers(response.data))
//       .catch(error => console.error('Error fetching drivers:', error));
//   }, []);

//   const handleMarkAttendance = (driverId) => {
//     axios.post('http://localhost:3001/api/attendance', { driver_id: driverId })
//       .then(response => {
//         setMessage(`Attendance marked for driver ${driverId}`);
//       })
//       .catch(error => {
//         console.error('Error marking attendance:', error);
//         setMessage('Error marking attendance');
//       });
//   };

//   return (
//     <div className="App">
//       <h1>Depomaster Attendance Dashboard</h1>
//       {message && <p>{message}</p>}
//       <div className="driver-list">
//         {drivers.map(driver => (
//           <DriverCard key={driver.driver_id} driver={driver} onMarkAttendance={handleMarkAttendance} />
//         ))}
//       </div>
//     </div>
//   );
// }

// export default DriverDetails;
