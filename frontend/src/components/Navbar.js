import React from "react";
import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="college-name">
        <a 
          href="https://sjec.ac.in/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="college-link"
        >
          St Joseph Engineering College
        </a>
      </div>

      <div className="nav-links">
        <Link to="/home">Home</Link> 
        <Link to="/about">About</Link>
        <Link to="/coverage">Network Coverage</Link>
      </div>
    </nav>
  );
}

export default Navbar;
