import React from "react";
import { useLocation } from "react-router-dom";

function Results() {
  const location = useLocation();
  const query = location.state?.query || "Unknown";

  return (
    <div className="results">
      <h1>Search Results</h1>
      <p>You searched for: <strong>{query}</strong></p>
      <p>Navigation features will appear here...</p>
    </div>
  );
}

export default Results;
