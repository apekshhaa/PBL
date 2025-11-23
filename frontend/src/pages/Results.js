import React from "react";
import { useLocation } from "react-router-dom";
import MapView from "../components/MapView";
import { useEffect, useState } from "react";

function Results() {
  const location = useLocation();
  const query = location.state?.query || "";

  const [destInfo, setDestInfo] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [etaMinutes, setEtaMinutes] = useState(null);

  useEffect(() => {
    if (!query) return;

    // fetch destination coordinates from backend
    fetch(`http://localhost:5000/api/location/${encodeURIComponent(query)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Destination not found');
        return res.json();
      })
      .then((data) => {
        setDestInfo(data);
      })
      .catch((err) => {
        console.warn('Could not fetch destination:', err);
        setDestInfo(null);
      });

    // get user location (browser geolocation)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserPos(coords);
        },
        (err) => {
          console.warn('Geolocation failed:', err);
          setUserPos(null);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [query]);

  useEffect(() => {
    if (!destInfo || !userPos) return;

    const haversineKm = (a, b) => {
      const toRad = v => (v * Math.PI) / 180;
      const R = 6371; // km
      const dLat = toRad(b.lat - a.lat);
      const dLon = toRad(b.lng - a.lng);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const sinDLat = Math.sin(dLat / 2);
      const sinDLon = Math.sin(dLon / 2);
      const aa = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
      return R * c;
    };

    const destCoords = { lat: destInfo.lat || destInfo.location?.lat, lng: destInfo.lng || destInfo.location?.lng };
    if (!destCoords.lat || !destCoords.lng) return;

    const d = haversineKm(userPos, destCoords);
    setDistanceKm(d);
    // estimate walking at 5 km/h
    setEtaMinutes(Math.round((d / 5) * 60));
  }, [destInfo, userPos]);

  if (!query) {
    return (
      <div className="results">
        <h1 style={{ textAlign: "center" }}>No destination selected</h1>
      </div>
    );
  }

  return (
    <div className="results">
      <h1 style={{ marginBottom: 12 }}>Search Results</h1>
      <p style={{ marginBottom: 18 }}>You searched for: <strong>{query}</strong></p>

      {distanceKm != null ? (
        <div style={{ marginBottom: 12 }}>
          <strong>Distance:</strong> {distanceKm.toFixed(2)} km • <strong>ETA:</strong> {etaMinutes} min (walking)
        </div>
      ) : (
        <div style={{ marginBottom: 12, color: '#ccc' }}>
          Calculating distance… (allow location access if prompted)
        </div>
      )}

      <div className="results-grid">
        <div className="map-panel">
          <MapView destination={query} />
        </div>

        <aside className="info-panel">
          <h3 style={{ marginTop: 0 }}>Route details</h3>
          <p>Destination: <strong>{query}</strong></p>
          <p>The map will show a route from your current location to the destination. Use the map to zoom or pan.</p>
          <hr style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
          <div id="route-steps">
            <p style={{ color: '#000', fontSize: 14 }}>Turn-by-turn instructions will appear here in a future update.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Results;
