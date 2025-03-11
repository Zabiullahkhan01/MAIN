import React, { useEffect, useState } from "react";
import { GoogleMap, DirectionsRenderer, useJsApiLoader } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100vh", // adjust height as needed
};

function MapContainer({ driverLocation, route, googleMapsApiKey }) {
  const [directions, setDirections] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
  });

  // Set map center based on driver location if available; otherwise, use route's source coordinates
  useEffect(() => {
    if (driverLocation) {
      setMapCenter({
        lat: driverLocation.latitude,
        lng: driverLocation.longitude,
      });
    } else if (route?.source_lat && route?.source_lng) {
      setMapCenter({
        lat: parseFloat(route.source_lat),
        lng: parseFloat(route.source_lng),
      });
    }
  }, [driverLocation, route]);

  // Once API is loaded, call DirectionsService manually
  useEffect(() => {
    if (!isLoaded || !route) return;

    const directionsService = new window.google.maps.DirectionsService();

    // Origin: driver's current location if available, else route's source coordinates
    const origin = driverLocation
      ? new window.google.maps.LatLng(driverLocation.latitude, driverLocation.longitude)
      : new window.google.maps.LatLng(parseFloat(route.source_lat), parseFloat(route.source_lng));

    // Destination: use the destination address string from the route.
    const destination = route.destination;

    // Build waypoints from route.stops (which is now an array of stop objects)
    let waypoints = [];
    if (Array.isArray(route.stops)) {
      waypoints = route.stops.map((stop) => ({
        location: new window.google.maps.LatLng(parseFloat(stop.stop_lat), parseFloat(stop.stop_lng)),
        stopover: true,
      }));
    }

    // Log parameters for debugging purposes
    console.log("Directions Request Parameters:");
    console.log("Origin:", origin);
    console.log("Destination:", destination);
    console.log("Waypoints:", waypoints);

    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
        waypoints,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
        } else {
          console.error("Error fetching directions", { result, status });
        }
      }
    );
  }, [isLoaded, route, driverLocation]);

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={mapCenter} zoom={13}>
      {directions && <DirectionsRenderer directions={directions} />}
    </GoogleMap>
  );
}

export default MapContainer;
