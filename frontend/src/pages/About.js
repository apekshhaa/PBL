

/*import React from "react";
import "./About.css"; // Make sure to create this file
import PrismaticBurst from '../components/PrismaticBurst';


function About() {
  return (
    <div className="about-container">
      <div className="about-content">
        <h1 className="about-title">About Smart Campus Navigator</h1>

        <p className="about-text">
          Every year, hundreds of first-year students, parents, visitors, and even
          new faculty struggle to find their way around the campus. Classrooms,
          labs, offices, and facilities are spread across multiple blocks, and
          navigating them for the first time is often confusing.
        </p>

        <p className="about-text">
          To solve this problem, we built <strong>Smart Campus Navigator</strong>,
          a digital guide designed specifically for St Joseph Engineering College.
          It helps users search for locations, explore campus hotspots, and move
          around with ease.
        </p>

        <p className="about-text">
          Another challenge students face is trying to figure out which mobile
          network works best in which part of the campus. Instead of running
          around different blocks and open areas trying to find the strongest
          signal, our platform gives a quick overview of the{" "}
          <strong>static network coverage conditions</strong> of Airtel, Jio,
          BSNL, and VI in major locations—making campus life simpler and more
          convenient.
        </p>

        <h2 className="features-heading">Key Features</h2>
        <ul className="features-list">
          <li>Interactive Digital Campus Navigation</li>
          <li>Easy Search for Buildings, Labs & Departments</li>
          <li>Predefined Network Coverage Mapping (Static Data)</li>
          <li>Popular and Frequently Visited Location Suggestions</li>
          <li>Simple, Fast and User-Friendly Interface</li>
        </ul>
      </div>
    </div>
  );
}

export default About;

*/

import React from "react";
import "./About.css";
import PrismaticBurst from "../components/PrismaticBurst";

function About() {
  return (
    <div className="about-container">

      {/* 🔵 Background Animation */}
      <div className="animation-bg">
        <PrismaticBurst
          animationType="rotate3d"
          intensity={2}
          speed={0.5}
          distort={1.0}
          paused={false}
          offset={{ x: 0, y: 0 }}
          hoverDampness={0.25}
          rayCount={24}
          mixBlendMode="lighten"
          colors={["#ff007a", "#4d3dff", "#ffffff"]}
        />
      </div>

      {/* 🔵 Foreground Content */}
      <div className="about-content">

        <div className="about-title-box">
          <h1 className="about-title">About Smart Campus Navigator</h1>
        </div>

        <p className="about-text">
          Every year, hundreds of first-year students, parents, visitors, and even
          new faculty struggle to find their way around the campus. Classrooms,
          labs, offices, and facilities are spread across multiple blocks, and
          navigating them for the first time is often confusing.
        </p>

        <p className="about-text">
          To solve this problem, we built <strong>Smart Campus Navigator</strong>,
          a digital guide designed specifically for St Joseph Engineering College.
          It helps users search for locations, explore campus hotspots, and move
          around with ease.
        </p>

        <p className="about-text">
          Another challenge students face is trying to figure out which mobile
          network works best in different parts of the campus. Instead of walking
          around various blocks trying to find the strongest signal, our platform
          provides a quick overview of the{" "}
          <strong> Network Coverage</strong> for Airtel, Jio, BSNL, and VI
          across major locations—making campus life easier and more convenient.
        </p>

        <h2 className="features-heading">Key Features</h2>
        <ul className="features-list">
          <li>Interactive Digital Campus Navigation</li>
          <li>Easy Search for Buildings, Labs & Auditoriums</li>
          <li>Predefined Network Coverage Mapping </li>
          <li>Popular and Frequently Visited Location Suggestions</li>
          <li>Simple, Fast and User-Friendly Interface</li>
        </ul>
      </div>

    </div>
  );
}

export default About;


