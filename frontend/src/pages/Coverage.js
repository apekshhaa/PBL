

import React, { useState } from "react";
import Galaxy from "../components/Galaxy";  
import "./coverage.css";

function Coverage() {
  const [selectedPlace, setSelectedPlace] = useState(null);

  const coverageData = {
    Library: { Airtel: "green", Jio: "yellow", BSNL: "red", Vi: "green" },
    Canteen: { Airtel: "yellow", Jio: "green", BSNL: "red", Vi: "yellow" },
    Cafeteria: { Airtel: "green", Jio: "green", BSNL: "yellow", Vi: "yellow" },
    Auditorium: { Airtel: "yellow", Jio: "yellow", BSNL: "red", Vi: "green" },
    "Academic Block 1": { Airtel: "green", Jio: "green", BSNL: "yellow", Vi: "yellow" },
    "Academic Block 2": { Airtel: "yellow", Jio: "yellow", BSNL: "red", Vi: "green" },
    "Academic Block 3": { Airtel: "yellow", Jio: "yellow", BSNL: "yellow", Vi: "yellow" },

    // NEW AREAS YOU ADDED
    "Prerna Hall": { Airtel: "red", Jio: "red", BSNL: "red", Vi: "red" },
    "Spoorthi Hall": { Airtel: "green", Jio: "green", BSNL: "yellow", Vi: "yellow" },
    "Fr. Fred Hall": { Airtel: "green", Jio: "yellow", BSNL: "red", Vi: "green" },
    "Student Square": { Airtel: "green", Jio: "green", BSNL: "green", Vi: "green" },
    "Civil Block": { Airtel: "green", Jio: "yellow", BSNL: "red", Vi: "yellow" },
    "Mechanical Block": { Airtel: "green", Jio: "green", BSNL: "red", Vi: "green" },
    "Training & Placement": { Airtel: "yellow", Jio: "yellow", BSNL: "red", Vi: "yellow" },
  };

  const places = Object.keys(coverageData);

  const leftColumn = places.slice(0, Math.ceil(places.length / 2));
  const rightColumn = places.slice(Math.ceil(places.length / 2));

  return (
    <div className="coverage-page">

      {/* ⭐ Galaxy Background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <Galaxy
          mouseRepulsion={true}
          mouseInteraction={true}
          density={1.2}
          glowIntensity={0.45}
          saturation={0.0}
          hueShift={0}
          colorTint={[1.0, 1.0, 1.0]}
          transparent={true}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* ⭐ Foreground Content */}
      <div style={{ position: "relative", zIndex: 1 }}>

        <h1 className="coverage-title">Network Coverage Zones</h1>

        {/* ⭐ Two-Column Button Layout */}
        <div className="button-grid">

          <div className="column">
            {leftColumn.map((place) => (
              <button
                key={place}
                className="place-button"
                onClick={() => setSelectedPlace(place)}
              >
                {place}
              </button>
            ))}
          </div>

          <div className="column">
            {rightColumn.map((place) => (
              <button
                key={place}
                className="place-button"
                onClick={() => setSelectedPlace(place)}
              >
                {place}
              </button>
            ))}
          </div>

        </div>

        {/* ⭐ Coverage report card */}
        {selectedPlace && (
          <div className="coverage-card">
            <h2>{selectedPlace} – Coverage Report</h2>

            <div className="sim-grid">
              {Object.entries(coverageData[selectedPlace]).map(([sim, color]) => (
                <div key={sim} className={`sim-box ${color}`}>
                  <span className="sim-name">{sim}</span>
                  <span className="sim-strength">
                    {color === "green" && "Excellent ✓"}
                    {color === "yellow" && "Average ~"}
                    {color === "red" && "Poor ✗"}
                  </span>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default Coverage;
