import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ComponentFour from "./componentFour.jsx";
import ComponentFive from "./componentFive.jsx";
import ComponentSix from "./componentSix.jsx";
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
              to="/driver-dashboard/componentFive"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Component Five
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/driver-dashboard/componentSix"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Component Six
            </NavLink>
          </li>
          <li>
            <button onClick={logOut} className="btn btn-primary">
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
            <Route path="/componentFive" element={<ComponentFive />} />
            <Route path="/componentSix" element={<ComponentSix />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

export default DriverDashboard;
