import React from 'react';

const Navbar = () => {
  return (
    <nav className="navbar">
      <h2>Smart Campus Navigator</h2>
      <ul className="nav-links">
        <li>Home</li>
        <li>Map</li>
        <li>Network Coverage</li>
        <li>Facilities</li>
        <li>Logout</li>
      </ul>
    </nav>
  );
};

export default Navbar;

