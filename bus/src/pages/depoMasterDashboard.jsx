import { useEffect, useState, useRef } from "react";
import { useNavigate, NavLink, Routes, Route } from "react-router-dom";
import BusSchedule from "../components/busSchedule.jsx";
import DriverDetails from "../components/driverDetails.jsx";
import DepoMasterAlerts from "../components/depoMasterAlerts.jsx";
import WeglotRefresh from "../weglot";
import "../App.css";

// A small beep sound encoded in WAV format (base64).
// You can adjust or replace this with your own data URI.


function DepoMasterDashboard() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [alertCount, setAlertCount] = useState(0);
  const [unseenCount, setUnseenCount] = useState(0);
  // Ref to keep track of previous unseen count
  const prevUnseenRef = useRef(unseenCount);

  // Mark alerts as seen when Bus Alerts are viewed.
  const markAlertsAsSeen = () => {
    localStorage.setItem("lastSeenAlertCount", alertCount);
    setUnseenCount(0);
  };

  const logOut = () => {
    localStorage.removeItem("token");
    navigate("/");
    window.location.reload();
  };

  // Fetch dashboard message.
  useEffect(() => {
    if (window.Weglot) {
      window.Weglot.initialize({
        api_key: "wg_1c5aa01b0ed0d8e3cbe15bcfd9bf94023",
        dynamic: true,
      });
    }
    fetch("http://localhost:5000/depo-master-dashboard", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Dashboard message:", data.message);
        setMessage(data.message);
      })
      .catch((err) => {
        console.error("Error loading dashboard", err);
        setMessage("Error loading dashboard");
      });
  }, []);

  // Helper: Fetch alerts and update counts.
  const fetchAlerts = () => {
    fetch("http://localhost:5000/api/alerts")
      .then((res) => res.json())
      .then((data) => {
        // Data can be an array or an object with an "alerts" key.
        const count = Array.isArray(data)
          ? data.length
          : data.alerts
          ? data.alerts.length
          : 0;
        let storedCount = parseInt(localStorage.getItem("lastSeenAlertCount"), 10);
        if (isNaN(storedCount)) {
          // On first load, mark the current alerts as seen.
          storedCount = count;
          localStorage.setItem("lastSeenAlertCount", count);
        }
        setAlertCount(count);
        setUnseenCount(Math.max(count - storedCount, 0));
      })
      .catch((err) => console.error("Error fetching alerts", err));
  };

  // Initial alerts fetch.
  useEffect(() => {
    fetchAlerts();
  }, []);

  // Poll alerts every 10 seconds.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAlerts();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Play a notification sound if unseenCount increases.
  useEffect(() => {
    if (unseenCount > prevUnseenRef.current) {
      const audio = new Audio('/notification.mp3');
      audio.play().catch((err) => console.error('Audio play failed:', err));
    }
    prevUnseenRef.current = unseenCount;
  }, [unseenCount]);

  // Sidebar component.
  const Sidebar = () => (
    <nav className="sidebar">
      <ul>
        <li>
          <h2>Depomaster Dashboard</h2>
        </li>
        <hr />
        <br />
        <li>
          <NavLink
            to="/depo-master-dashboard/busSchedule"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Bus Schedule
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/depo-master-dashboard/driverDetails"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Attendance Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/depo-master-dashboard/depoMasterAlerts"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
            onClick={markAlertsAsSeen}
          >
            <span className="nav-item">
              Bus Alerts
              {unseenCount > 0 && (
                <span className="alert-badge">{unseenCount}</span>
              )}
            </span>
          </NavLink>
        </li>
      </ul>
      <button onClick={logOut} className="logout">
        Log Out
      </button>
    </nav>
  );

  return (
    <div className="app-container">
      <WeglotRefresh />
      <Sidebar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<BusSchedule />} />
          <Route path="/busSchedule" element={<BusSchedule />} />
          <Route path="/driverDetails" element={<DriverDetails />} />
          <Route path="/depoMasterAlerts" element={<DepoMasterAlerts />} />
        </Routes>
      </div>
    </div>
  );
}

export default DepoMasterDashboard;
