import React, { useEffect, useState } from "react";

function NetworkCoverage() {
  const [data, setData] = useState([]);
  const [strongest, setStrongest] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/campus") // backend API
      .then((res) => res.json())
      .then((info) => {
        setData(info);

        // find the strongest network spot (assuming each has a 'strength' field)
        const bestSpot = info.reduce((max, curr) =>
          curr.strength > max.strength ? curr : max
        );
        setStrongest(bestSpot);
      })
      .catch((err) => console.error("Error fetching:", err));
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📶 Smart Campus Network Coverage</h2>

      {strongest ? (
        <div>
          <h3>🏆 Strongest Network Spot</h3>
          <p>
            <strong>Location:</strong> {strongest.location} <br />
            <strong>Signal Strength:</strong> {strongest.strength}
          </p>
        </div>
      ) : (
        <p>Loading data...</p>
      )}

      <hr />

      <h3>All Recorded Spots</h3>
      <ul>
        {data.map((spot) => (
          <li key={spot._id}>
            {spot.location} — {spot.strength}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default NetworkCoverage;
