import React from "react";
import "../css/modal.css";

function Modal({ isOpen, onClose, route, onGo }) {
  if (!isOpen || !route) return null;

  // Use stops from the route if it's an array; otherwise, default to an empty array.
  const stopsArray = Array.isArray(route.stops) ? route.stops : [];

  // Build a list of points: source, stops (in order), and destination.
  const allPoints = [];
  if (route.source_name) {
    allPoints.push({ type: "source", name: route.source_name });
  }
  stopsArray.forEach((stop) => {
    allPoints.push({ type: "stop", name: stop.stop_name });
  });
  if (route.destination_name) {
    allPoints.push({ type: "destination", name: route.destination_name });
  }

  const handleGoClick = () => {
    onGo(route);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Route Header */}
        <div className="route-header">
          <span className="route-number">{route.route_id}</span>
        </div>

        {/* Display route stops as a vertical timeline */}
        <div className="route-stops">
          {allPoints.map((point, index) => (
            <div className="stop" key={index}>
              <div className={`circle ${point.type}`} />
              <div className="stop-info">
                <h4>{point.name}</h4>
                {point.type === "source" && (
                  <span className="sub-label">Start</span>
                )}
                {point.type === "destination" && (
                  <span className="sub-label">End</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* "Go" Button */}
        <button className="go-btn" onClick={handleGoClick}>
          Go
        </button>
      </div>
    </div>
  );
}

export default Modal;
