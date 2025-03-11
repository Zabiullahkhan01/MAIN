import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ComponentFour from "../components/componentFour.jsx";
import DriverRoutes  from "../components/driverRoutes.jsx";
import DriverAlertForm from "../components/driverAlertForm.jsx";
import { Routes, Route, NavLink } from "react-router-dom";

function DriverDashboard() {
  const navigate = useNavigate();
  const logOut = () => {
    // window.localStorage.clear();
    // window.location.href = "/";
    localStorage.removeItem("token"); // Remove JWT Token
    navigate("/"); // Redirect to login page
  };


  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/driver-dashboard", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("Error loading dashboard"));
  }, []);


  const Sidebar = () => {
    return (
      <nav className="sidebar">
        <ul>
          <li>
            <NavLink
              to="/driver-dashboard/componentFour"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Component Four
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/driver-dashboard/driverRoutes"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
             Routes 
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/driver-dashboard/driverAlertForm"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Alert Form
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
            <Route path="/" element={<ComponentFour />} />
            <Route path="/componentFour" element={<ComponentFour />} />
            <Route path="/driverRoutes" element={<DriverRoutes />} />
            <Route path="/driverAlertForm" element={<DriverAlertForm />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

export default DriverDashboard;
