import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import '../css/driverDetail.css'; // Ensure the CSS path is correct

// DriverCard Component: Displays individual driver details,
// handles check-in, check-out, and replacement logic.
function DriverCard({ driver, onCheckIn, onCheckOut, onReplace }) {
  // Use driver.stableId or driver.driver_id as the unique key.
  const stableId = driver.stableId || driver.driver_id;

  // Helper functions use driver-specific localStorage keys.
  const getStoredCheckIn = (id) => {
    const data = localStorage.getItem(`checkIn_${id}`);
    const formattedDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        return parsed.date === formattedDate ? parsed.checked : false;
      } catch (e) {
        return false;
      }
    }
    return false;
  };

  const getStoredCheckOut = (id) => {
    const data = localStorage.getItem(`checkOut_${id}`);
    const formattedDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        return parsed.date === formattedDate ? parsed.checked : false;
      } catch (e) {
        return false;
      }
    }
    return false;
  };

  // Local state for check-in/out and replacement popup.
  const [checkedIn, setCheckedIn] = useState(() => getStoredCheckIn(stableId));
  const [checkedOut, setCheckedOut] = useState(() => getStoredCheckOut(stableId));
  const [message, setMessage] = useState("");
  const [showReplacePopup, setShowReplacePopup] = useState(false);
  const [replacementId, setReplacementId] = useState("");

  // Update check-in/out state when the driver's id changes.
  useEffect(() => {
    setCheckedIn(getStoredCheckIn(driver.driver_id));
    setCheckedOut(getStoredCheckOut(driver.driver_id));
  }, [driver.driver_id]);

  // Auto-clear messages after 3 seconds.
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleCheckInClick = () => {
    onCheckIn(stableId)
      .then(() => {
        setCheckedIn(true);
        setCheckedOut(false);
        const formattedDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
        localStorage.setItem(`checkIn_${stableId}`, JSON.stringify({ checked: true, date: formattedDate }));
        localStorage.removeItem(`checkOut_${stableId}`);
        setMessage("Check-in successful!");
      })
      .catch(() => setMessage("Error checking in"));
  };

  const handleCheckOutClick = () => {
    if (checkedIn && !checkedOut) {
      onCheckOut(stableId)
        .then(() => {
          setCheckedOut(true);
          const formattedDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
          localStorage.setItem(`checkOut_${stableId}`, JSON.stringify({ checked: true, date: formattedDate }));
          setMessage("Check-out successful!");
        })
        .catch(() => setMessage("Error checking out"));
    }
  };

  const handleReplaceClick = () => {
    setShowReplacePopup(true);
  };

  // When a replacement is confirmed, call onReplace (from parent),
  // migrate localStorage keys, and show feedback.
  const confirmReplacement = async () => {
    const cleanReplacementId = replacementId.trim();
    if (!cleanReplacementId) {
      setShowReplacePopup(false);
      return;
    }
    try {
      const newDriver = await onReplace(stableId, cleanReplacementId);
      // Migrate localStorage check-in/out keys from old driver id to new one.
      const checkInData = localStorage.getItem(`checkIn_${stableId}`);
      if (checkInData) {
        localStorage.removeItem(`checkIn_${stableId}`);
        localStorage.setItem(`checkIn_${newDriver.driver_id}`, checkInData);
      }
      const checkOutData = localStorage.getItem(`checkOut_${stableId}`);
      if (checkOutData) {
        localStorage.removeItem(`checkOut_${stableId}`);
        localStorage.setItem(`checkOut_${newDriver.driver_id}`, checkOutData);
      }
      setMessage("Replacement successful!");
    } catch (error) {
      setMessage("Error replacing driver");
    }
    setShowReplacePopup(false);
    setReplacementId("");
  };

  // Prepare the driver's picture URL.
  let imgSrc = driver.picture_url;
  if (!imgSrc.startsWith("http")) {
    imgSrc = `http://localhost:3001/${imgSrc}`;
  }
  imgSrc = imgSrc.replace(/:\d+$/, '');

  return (
    <div className="driver-card">
      <img src={imgSrc} alt={driver.name} className="driver-pic" />
      <h3>{driver.name}</h3>
      <span className="driver-id">ID: {driver.driver_id}</span>
      {/* Render Check In and Replace buttons if not checked in */}
      {!checkedIn && (
        <>
          <button onClick={handleCheckInClick}>Check In</button>
          <button onClick={handleReplaceClick}>Replace</button>
        </>
      )}
      {/* Render Check Out button if already checked in */}
      {checkedIn && (
        <button onClick={handleCheckOutClick} disabled={checkedOut}>
          {checkedOut ? "Checked Out" : "Check Out"}
        </button>
      )}
      {message && <p className="message">{message}</p>}
      {showReplacePopup && (
        <div className="popup-container">
          <input
            type="text"
            placeholder="New Driver ID"
            value={replacementId}
            onChange={(e) => setReplacementId(e.target.value)}
          />
          <div className="popup-buttons">
          <button onClick={confirmReplacement}>Confirm</button>
          <button onClick={() => setShowReplacePopup(false)}>Cancel</button>
          </div>
          
        </div>
      )}
    </div>
  );
}

// DriverDetails Component: Fetches the driver list and provides handlers for check-in,
// check-out, and replacement. It also merges persistent replacement mappings from local storage.
function DriverDetails() {
  const [drivers, setDrivers] = useState([]);
  const [globalMessage, setGlobalMessage] = useState("");
  const currentDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');

  // On mount, fetch drivers and merge replacement mapping, if available.
  useEffect(() => {
    // Check local storage for saved replacement mapping for today.
    let replacementsMapping = null;
    const storedMapping = localStorage.getItem('replacements');
    if (storedMapping) {
      try {
        replacementsMapping = JSON.parse(storedMapping);
        // Clear out stored mapping if it's not for today.
        if (replacementsMapping.date !== currentDate) {
          localStorage.removeItem('replacements');
          replacementsMapping = null;
        }
      } catch (e) {
        localStorage.removeItem('replacements');
        replacementsMapping = null;
      }
    }

    axios
      .get('http://localhost:3001/api/drivers')
      .then(response => {
        const driversData = response.data.map(driver => {
          // Use driver.driver_id as the initial stable key.
          const stableId = driver.driver_id;
          let updatedDriver = { ...driver, stableId };
          // If a replacement exists for this driver, merge its details.
          if (replacementsMapping && replacementsMapping.mapping && replacementsMapping.mapping[stableId]) {
            const replacement = replacementsMapping.mapping[stableId];
            updatedDriver = {
              ...updatedDriver,
              ...replacement,
              driver_id: replacement.driver_id,
              stableId: replacement.driver_id
            };
          }
          return updatedDriver;
        });
        setDrivers(driversData);
      })
      .catch(() => setGlobalMessage('Error fetching drivers'));
  }, [currentDate]);

  useEffect(() => {
    if (globalMessage && globalMessage !== "Replacement successful!") {
      const timer = setTimeout(() => setGlobalMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [globalMessage]);

  const handleCheckIn = async (id) => {
    return axios.post('http://localhost:3001/api/attendance/checkin', { driver_id: id });
  };

  const handleCheckOut = async (id) => {
    return axios.post('http://localhost:3001/api/attendance/checkout', { driver_id: id });
  };

  // For replacement: fetch new driver details, call the replacement API endpoint,
  // update the state, and persist the mapping in local storage.
  const handleReplace = async (stableId, replacementId) => {
    try {
      const encodedId = encodeURIComponent(replacementId);
      // Get new driver details.
      const response = await axios.get(`http://localhost:3001/api/drivers/${encodedId}`);
      const newDriver = response.data;
      
      // Call the replacement endpoint.
      await axios.post('http://localhost:3001/api/attendance/replace', {
        originalDriverId: stableId,
        replacementDriverId: newDriver.driver_id
      });
      
      // Update drivers state so the dashboard reflects the change.
      setDrivers(prevDrivers =>
        prevDrivers.map(driver =>
          driver.stableId === stableId
            ? { ...driver, ...newDriver, driver_id: newDriver.driver_id, stableId: newDriver.driver_id }
            : driver
        )
      );
      setGlobalMessage("Replacement successful!");

      // Update local storage with the replacement mapping.
      let replacementsMapping = { date: currentDate, mapping: {} };
      const storedMapping = localStorage.getItem('replacements');
      if (storedMapping) {
        try {
          const parsed = JSON.parse(storedMapping);
          if (parsed.date === currentDate) {
            replacementsMapping.mapping = { ...parsed.mapping };
          }
        } catch (e) {
          // Ignore errors.
        }
      }
      // Store mapping: key = original stableId, value = newDriver object.
      replacementsMapping.mapping[stableId] = newDriver;
      localStorage.setItem('replacements', JSON.stringify(replacementsMapping));
      
      return newDriver;
    } catch (error) {
      console.error("Error replacing driver:", error);
      setGlobalMessage("Error replacing driver");
      throw error;
    }
  };

  return (
    <div className="App">
      <h1>Crew Attendance Dashboard</h1>
      {globalMessage && <p className="message">{globalMessage}</p>}
      <div className="driver-list">
        {drivers.map(driver => (
          <DriverCard
            key={driver.stableId}
            driver={driver}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onReplace={handleReplace}
          />
        ))}
      </div>
    </div>
  );
}

export default DriverDetails;
