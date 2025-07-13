
import './App.css';
import Login from './pages/login.jsx';
import DriverDashboard from "./pages/driverDashboard.jsx";
import DepoMasterDashboard from "./pages/depoMasterDashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute";
import { Routes, Route, NavLink } from 'react-router-dom';
import WeglotRefresh from "./weglot";
function App() {
  
  return (
    <>  <WeglotRefresh />
      <Routes>
         
        <Route path="/" element={<Login />} />
        
        <Route
          path="/driver-dashboard/*"
          element={
            <ProtectedRoute role="driver">
              <DriverDashboard />
            </ProtectedRoute>
          }
        />
        window.location.reload();
        <Route
          path="/depo-master-dashboard/*"
          element={
            <ProtectedRoute role="depo-master">
              <DepoMasterDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;

