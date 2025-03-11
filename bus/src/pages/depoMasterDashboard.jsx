import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BusSchedule from "../components/busSchedule.jsx";
import DriverDetails from "../components/driverDetails.jsx";
import DepoMasterAlerts from "../components/depoMasterAlerts.jsx";
import { Routes, Route, NavLink } from "react-router-dom";
import '../App.css';

function DepoMasterDashboard() {
  const navigate = useNavigate();
  const logOut = () => {
    // window.localStorage.clear();
    // window.location.href = "/";
    localStorage.removeItem("token"); // Remove JWT Token
    navigate("/"); // Redirect to login page
  };

  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/depo-master-dashboard", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("Error loading dashboard"));
  }, []);

  // Dummy bus data to pass to BusSchedule
  const dummyBusData = [
    {
      busNo: '101',
      driverName: 'John Doe',
      source: 'A',
      destination: 'B',
      hour: 7,
      minutes: 30,
    },
    {
      busNo: '102',
      driverName: 'Jane Smith',
      source: 'A',
      destination: 'C',
      hour: 8,
      minutes: 45,
    },
    {
      busNo: '103',
      driverName: 'bob',
      source: 'A',
      destination: 'D',
      hour: 9,
      minutes: 30,
    },
    {
      busNo: '102',
      driverName: 'Jane Smith',
      source: 'A',
      destination: 'E',
      hour: 10,
      minutes: 45,
    },
    {
      busNo: '101',
      driverName: 'John Doe',
      source: 'A',
      destination: 'F',
      hour: 11,
      minutes: 30,
    },
    {
      busNo: '102',
      driverName: 'Jane Smith',
      source: 'C',
      destination: 'G',
      hour: 12,
      minutes: 45,
    },
  ];
  

  const Sidebar = () => {
    return (
      <nav className="sidebar">
        <ul>
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
              Driver Details
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/depo-master-dashboard/depoMasterAlerts"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Bus Alerts
            </NavLink>
          </li>
          <li>
            <button onClick={logOut} className="logout">
              Log Out
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  return (
    <>
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<BusSchedule busData={dummyBusData}/>} />
            <Route path="/busSchedule" element={<BusSchedule busData={dummyBusData} />} />
            <Route path="/driverDetails" element={<DriverDetails />} />
            <Route path="/depoMasterAlerts" element={<DepoMasterAlerts />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

export default DepoMasterDashboard;
