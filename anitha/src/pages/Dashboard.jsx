import React from 'react';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h1>Dashboard</h1>
        <p>Welcome! Here are the features of Smart Campus Navigator:</p>
        <ul>
          <li>View campus map with shortest routes</li>
          <li>Check Wi-Fi & mobile network coverage heatmaps</li>
          <li>Locate academic blocks, hostels, and facilities</li>
          <li>Real-time navigation across campus</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
