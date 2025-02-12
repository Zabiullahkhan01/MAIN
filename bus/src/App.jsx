
import './App.css';
import Login from './pages/login.jsx';
import DriverDashboard from "./components/driverDashboard";
import DepoMasterDashboard from "./components/depoMasterDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { Routes, Route, NavLink } from 'react-router-dom';

// const Sidebar = () => {
//   return (
//     <nav className="sidebar">
//       <ul>
//         <li>
//           <NavLink to="/componentOne" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
//             Component One
//           </NavLink>
//         </li>
//         <li>
//           <NavLink to="/componentTwo" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
//             Component Two
//           </NavLink>
//         </li>
//         <li>
//           <NavLink to="/componentThree" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
//             Component Three
//           </NavLink>
//         </li>
//       </ul>
//     </nav>
//   );
// };

function App() {
  return (
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
        <Route
          path="/depo-master-dashboard/*"
          element={
            <ProtectedRoute role="depo-master">
              <DepoMasterDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
  );
}

export default App;

