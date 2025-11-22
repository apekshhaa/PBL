import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const styles = {
  container: {
    position: "relative",
    height: "calc(100vh - 80px)", // leave space for navbar
    width: "100%",
  },
  map: {
    height: "100%",
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
  },
  overlay: {
    position: "absolute",
    top: 12,
    right: 12,
    background: "rgba(255,255,255,0.95)",
    color: "#333",
    padding: "8px 12px",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    fontSize: 13,
    zIndex: 1000,
  },
  spinnerOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.6)",
    zIndex: 1200,
  },
};

function Spinner() {
  return (
    <svg width="48" height="48" viewBox="0 0 50 50">
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="#007bff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="31.4 31.4"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 25 25"
          to="360 25 25"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

export default function MapView({ destination }) {
  const mapRef = useRef(null);
  const routingControlRef = useRef(null);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize map once
    mapRef.current = L.map("map", { zoomControl: true }).setView([12.9103, 74.8998], 17);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 20,
    }).addTo(mapRef.current);

    // Try to load local SJEC GeoJSON overlay (optional)
    (async () => {
      try {
        const res = await fetch("/sjec-campus.geojson");
        if (!res.ok) throw new Error("no geojson");
        const geoData = await res.json();
        L.geoJSON(geoData, {
          style: { color: "#0077b6", weight: 2, fillColor: "#90e0ef", fillOpacity: 0.3 },
        }).addTo(mapRef.current);
      } catch (e) {
        // not critical — just continue
        // console.info("GeoJSON not found or failed to load: ", e);
      }
    })();

    return () => {
      // Clean up map and routing control
      try {
        if (routingControlRef.current && mapRef.current) {
          mapRef.current.removeControl(routingControlRef.current);
          routingControlRef.current = null;
        }
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, []);

  useEffect(() => {
    if (!destination || !mapRef.current) return;

    let cancelled = false;
    setLoading(true);
    setStatus("Getting current location...");

    const apiUrl = `${API_BASE}/api/locations`;

    const run = async () => {
      try {
        // get current position as a promise
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
        );

        if (cancelled) return;
        const userLatLng = L.latLng(pos.coords.latitude, pos.coords.longitude);

        setStatus("Adding your marker...");
        L.marker(userLatLng, {
          icon: L.icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/64/64113.png", iconSize: [35, 35] }),
        })
          .addTo(mapRef.current)
          .bindPopup("You are here");

        setStatus("Fetching destination from server...");
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`fetch failed ${res.status}`);
        const locations = await res.json();

        if (cancelled) return;
        const dest = locations.find((l) => l.areaName && l.areaName.toLowerCase() === destination.toLowerCase());
        if (!dest) {
          setStatus("Destination not found");
          alert(`Destination "${destination}" not found in database!`);
          setLoading(false);
          return;
        }

        const destLatLng = L.latLng(dest.lat, dest.lng);
        setStatus("Adding destination marker...");
        L.marker(destLatLng, {
          icon: L.icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png", iconSize: [35, 35] }),
        })
          .addTo(mapRef.current)
          .bindPopup(dest.areaName || destination);

        // remove previous route if present
        if (routingControlRef.current && mapRef.current) {
          try {
            mapRef.current.removeControl(routingControlRef.current);
          } catch (e) {
            // ignore
          }
          routingControlRef.current = null;
        }

        routingControlRef.current = L.Routing.control({
          waypoints: [userLatLng, destLatLng],
          lineOptions: { styles: [{ color: "#007bff", weight: 5, opacity: 0.9 }] },
          createMarker: () => null,
          routeWhileDragging: false,
          showAlternatives: false,
        }).addTo(mapRef.current);

        mapRef.current.fitBounds([userLatLng, destLatLng], { padding: [60, 60] });
        setStatus("Route ready");
      } catch (err) {
        console.error("Map routing error:", err);
        setStatus("Error: " + (err.message || "unknown"));
        if (err.code === 1) alert("Geolocation permission denied");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [destination]);

  return (
    <div style={styles.container}>
      <div id="map" style={styles.map} />

      <div style={styles.overlay}>
        <div style={{ fontWeight: 600 }}>{destination ? `Destination: ${destination}` : "Map"}</div>
        <div style={{ fontSize: 12, marginTop: 6, color: "#666" }}>{status}</div>
      </div>

      {loading && (
        <div style={styles.spinnerOverlay}>
          <Spinner />
        </div>
      )}
    </div>
  );
}
