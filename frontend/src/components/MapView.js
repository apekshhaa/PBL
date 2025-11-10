import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";

export default function MapView({ destination }) {
  const mapRef = useRef(null);
  const routingControlRef = useRef(null);

  useEffect(() => {
    // Initialize the map
    mapRef.current = L.map("map").setView([12.9102945, 74.8997661], 17);

    // Add map tiles (hybrid/satellite style)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapRef.current);

    return () => {
      mapRef.current.remove();
    };
  }, []);

  useEffect(() => {
    if (!destination) return;

    // Get user's current location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLatLng = L.latLng(pos.coords.latitude, pos.coords.longitude);

        // Fetch location data from your backend
        fetch("http://localhost:5000/api/locations")
          .then((res) => res.json())
          .then((locations) => {
            const dest = locations.find(
              (l) => l.name.toLowerCase() === destination.toLowerCase()
            );

            if (!dest) {
              alert("Destination not found in database!");
              return;
            }

            const destLatLng = L.latLng(dest.lat, dest.lng);

            // Remove previous route (if any)
            if (routingControlRef.current) {
              mapRef.current.removeControl(routingControlRef.current);
            }

            // Add route between current and destination
            routingControlRef.current = L.Routing.control({
              waypoints: [userLatLng, destLatLng],
              routeWhileDragging: false,
              showAlternatives: false,
              lineOptions: {
                styles: [
                  { color: "#007bff", weight: 6, opacity: 0.8 },
                  { color: "white", weight: 2, opacity: 0.6 },
                ],
              },
              createMarker: (i, waypoint, n) => {
                if (i === 0) {
                  return L.marker(waypoint.latLng, {
                    icon: L.icon({
                      iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
                      iconSize: [35, 35],
                    }),
                  }).bindPopup("You are here");
                } else if (i === n - 1) {
                  return L.marker(waypoint.latLng, {
                    icon: L.icon({
                      iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
                      iconSize: [35, 35],
                    }),
                  }).bindPopup(dest.name);
                }
                return null;
              },
            }).addTo(mapRef.current);

            // Fit the map bounds to the route
            mapRef.current.fitBounds([userLatLng, destLatLng]);
          })
          .catch((err) => console.error("Error fetching locations:", err));
      },
      (err) => console.error("Geolocation error:", err)
    );
  }, [destination]);

  return <div id="map" style={{ height: "100vh", width: "100%" }}></div>;
}
