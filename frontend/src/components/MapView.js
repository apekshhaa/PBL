import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useLocation } from "react-router-dom";

const campusLocations = {
  library: { lat: 12.9234, lng: 74.8567 },
  cafeteria: { lat: 12.9241, lng: 74.8578 },
  auditorium: { lat: 12.9239, lng: 74.8583 },
  "admin block": { lat: 12.9245, lng: 74.8590 },
  "amphi theatre": { lat: 12.9250, lng: 74.8570 },
};

function MapView() {
  const location = useLocation();
  const query = location.state?.query?.toLowerCase() || "";

  const destination = campusLocations[query];

  // Fallback if user types something invalid
  const position = destination
    ? [destination.lat, destination.lng]
    : [12.9238, 74.8572]; // Default campus center

  return (
    <MapContainer center={position} zoom={18} style={{ height: "100vh", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {destination ? (
        <Marker position={position}>
          <Popup>{query.charAt(0).toUpperCase() + query.slice(1)}</Popup>
        </Marker>
      ) : (
        <Popup position={position}>Destination not found</Popup>
      )}
    </MapContainer>
  );
}

export default MapView;
