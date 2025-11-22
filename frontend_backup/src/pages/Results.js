import React from "react";
import { useLocation } from "react-router-dom";
import MapView from "../components/MapView";

function Results() {
  const location = useLocation();
  const query = location.state?.query || "";

  return (
    <div className="results" style={{ textAlign: "center", padding: "20px" }}>
      <h1>Search Results</h1>
      <p>You searched for: <strong>{query || "Unknown"}</strong></p>

      {/* Render the map only if a query exists */}
      {query ? (
        <div style={{ height: "70vh", marginTop: "20px" }}>
          <MapView destination={query} />
        </div>
      ) : (
        <p>No destination selected.</p>
      )}
    </div>
  );
}

export default Results;
