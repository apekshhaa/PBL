import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";

export default function MapView({ destination }) {
  const mapRef = useRef(null);
  const routingControlRef = useRef(null);

  useEffect(() => {
    // Initialize map
    mapRef.current = L.map("map").setView([12.9103, 74.8998], 17);

    // Add OpenStreetMap tiles for background
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 20,
    }).addTo(mapRef.current);

    // Load SJEC GeoJSON overlay
    fetch("/sjec-campus.geojson")
      .then((res) => res.json())
      .then((geoData) => {
        L.geoJSON(geoData, {
          style: {
            color: "#0077b6",
            weight: 2,
            fillColor: "#90e0ef",
            fillOpacity: 0.3,
          },
        }).addTo(mapRef.current);
      });

    return () => {
      mapRef.current.remove();
    };
  }, []);

  // Handle routing when destination is available
  useEffect(() => {
    if (!destination) return;

    // Get user’s current location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLatLng = L.latLng(pos.coords.latitude, pos.coords.longitude);

        // Add marker for current position
        L.marker(userLatLng, {
          icon: L.icon({
            iconUrl: "https://cdn-icons-png.flaticon.com/512/64/64113.png",
            iconSize: [35, 35],
          }),
        })
          .addTo(mapRef.current)
          .bindPopup("You are here")
          .openPopup();

        // Get destination coordinates from backend
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

            // Add marker for destination
            L.marker(destLatLng, {
              icon: L.icon({
                iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
                iconSize: [35, 35],
              }),
            })
              .addTo(mapRef.current)
              .bindPopup(dest.name);

            // Remove previous route (if any)
            if (routingControlRef.current) {
              mapRef.current.removeControl(routingControlRef.current);
            }

            // Add routing path
            routingControlRef.current = L.Routing.control({
              waypoints: [userLatLng, destLatLng],
              lineOptions: {
                styles: [{ color: "#007bff", weight: 5, opacity: 0.8 }],
              },
              createMarker: () => null, // Hide default markers
              routeWhileDragging: false,
              showAlternatives: false,
            }).addTo(mapRef.current);

            // Zoom to the area
            mapRef.current.fitBounds([userLatLng, destLatLng]);
          });
      },
      (err) => {
        console.error("Geolocation error:", err);
        alert("Unable to fetch your current location.");
      }
    );
  }, [destination]);

  return <div id="map" style={{ height: "100vh", width: "100%" }}></div>;
}
