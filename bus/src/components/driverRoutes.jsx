import { useEffect, useState } from "react";
import Modal from "./modal";
import MapContainer from "./mapContainer";
import "../css/driverRoutes.css";

function DriverRoutes() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);

  // State to hold the route selected for map display
  const [mapRoute, setMapRoute] = useState(null);

  // Replace with your actual Google Maps API key
  const googleMapsApiKey = "AIzaSyCti1rEIcGqN142wOwA_hLG4FNMEj6ySvg";

  // Fetch routes with debounce on searchTerm
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim() !== "") {
        fetch(
          `http://localhost:3001/api/routes/search?stops=${encodeURIComponent(searchTerm)}`
        )
          .then((response) => response.json())
          .then((data) => {
            if (Array.isArray(data)) {
              setRoutes(data);
            } else {
              console.error("Expected an array for routes but got:", data);
              setRoutes([]);
            }
          })
          .catch((error) => console.error("Error searching routes:", error));
      } else {
        fetch("http://localhost:3001/api/routes?limit=10")
          .then((response) => response.json())
          .then((data) => {
            if (Array.isArray(data)) {
              setRoutes(data);
            } else {
              console.error("Expected an array for routes but got:", data);
              setRoutes([]);
            }
          })
          .catch((error) => console.error("Error fetching routes:", error));
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Get driver's geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDriverLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => console.error("Error getting location:", error)
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  }, []);

  // Open modal for route details
  const openModal = (route) => {
    setSelectedRoute(route);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRoute(null);
  };

  // When user clicks "Go" in the modal, hide all other UI and show only the map
  const handleGo = (route) => {
    closeModal();
    setMapRoute(route);
  };

  // If a map route is selected, render only the map view
  if (mapRoute) {
    return (
      <div className="full-map-container">
        <MapContainer
          driverLocation={driverLocation}
          route={mapRoute}
          googleMapsApiKey={googleMapsApiKey}
        />
      </div>
    );
  }

  // Otherwise, render the search and list view along with the modal (if open)
  return (
    <div className="driver-routes-container">
      <div className="header">
        <h1>Routes</h1>
        {isSearchActive ? (
          <input
            type="text"
            className="search-input"
            value={searchTerm}
            placeholder="Search routes..."
            onChange={(e) => setSearchTerm(e.target.value)}
            onBlur={() => setIsSearchActive(false)}
            autoFocus
          />
        ) : (
          <div className="search-icon" onClick={() => setIsSearchActive(true)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="search-icon-svg"
              width="24"
              height="24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="card-container">
        {routes.map((route) => (
          <div key={route.route_id} className="card" onClick={() => openModal(route)}>
            <h2>{route.route_name}</h2>
            <p>
              <strong>From:</strong> {route.source}
            </p>
            <p>
              <strong>To:</strong> {route.destination}
            </p>
          </div>
        ))}
      </div>

      {/* Modal for route details */}
      <Modal isOpen={isModalOpen} onClose={closeModal} route={selectedRoute} onGo={handleGo} />
    </div>
  );
}

export default DriverRoutes;























  // Initially fetch routes based on geolocation
  // useEffect(() => {
  //   if (navigator.geolocation) {
  //     navigator.geolocation.getCurrentPosition(
  //       (position) => {
  //         const { latitude, longitude } = position.coords;
  //         setDriverLocation({ latitude, longitude });

  //         // For production: fetch routes based on location
  //         fetch(`http://localhost:3001/api/routes?lat=${latitude}&lng=${longitude}`)
  //           .then((response) => response.json())
  //           .then((data) => setRoutes(data))
  //           .catch((error) => console.error("Error fetching routes:", error));
  //       },
  //       (error) => {
  //         console.error("Error getting location:", error);
  //       }
  //     );
  //   } else {
  //     console.error("Geolocation is not supported by this browser.");
  //   }
  // }, []);