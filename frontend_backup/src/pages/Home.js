/*import React from "react";
import ChatBox from "../components/ChatBox";

function Home() {
  return (
    <div className="home">
      <h1 className="main-title">Welcome to Smart Campus Navigator</h1>
      <ChatBox />
      <div className="suggestions">
        <h3>Suggestions:</h3>
        <ul>
          <li>Library</li>
          <li>Canteen</li>
          <li>Auditorium</li>
          <li>Admin Block</li>
          <li>Parking Area</li>
        </ul>
      </div>
    </div>
  );
}

export default Home;
*/

import React, { useState } from "react";
import ChatBox from "../components/ChatBox";
import Shuffle from "../components/Shuffle";
 // import Shuffle component

// Import images
import libraryImg from "../images/library.jpeg";
import cafeteriaImg from "../images/cafeteria.jpeg";
import auditoriumImg from "../images/auditorium.jpeg";
import adminBlockImg from "../images/admin.jpeg";
import amphiImg from "../images/amphi.jpeg";

function Home() {
  const [selectedImg, setSelectedImg] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const handleClick = (place) => {
    if (selectedPlace === place) {
      setSelectedImg(null);
      setSelectedPlace(null);
      return;
    }

    setSelectedPlace(place);

    switch (place) {
      case "Library":
        setSelectedImg(libraryImg);
        break;
      case "Cafeteria":
        setSelectedImg(cafeteriaImg);
        break;
      case "Auditorium":
        setSelectedImg(auditoriumImg);
        break;
      case "Admin Block":
        setSelectedImg(adminBlockImg);
        break;
      case "Amphi Theatre":
        setSelectedImg(amphiImg);
        break;
      default:
        setSelectedImg(null);
    }
  };

  return (
    <div className="home">
      {/* Animated heading using Shuffle */}
      <Shuffle
        text={
          selectedPlace
            ? `You selected: ${selectedPlace}`
            : "Welcome to Smart Campus Navigator"
        }
        shuffleDirection="right"
        duration={0.5}
        animationMode="evenodd"
        shuffleTimes={1}
        ease="power3.out"
        stagger={0.05}
        threshold={0.1}
        triggerOnce={true}
        triggerOnHover={false} // Only animate on load, not hover
        className="main-title"
        tag="h1"
      />

      <ChatBox />

      <div className="suggestions">
        <h3>Suggestions:</h3>
        <ul>
          {["Library", "Cafeteria", "Auditorium", "Admin Block", "Amphi Theatre"].map(
            (place) => (
              <li key={place} onClick={() => handleClick(place)}>
                {place}
              </li>
            )
          )}
        </ul>
      </div>

      {selectedImg && (
        <div className="selected-image">
          <img
            src={selectedImg}
            alt={selectedPlace}
            style={{ width: "60%", marginTop: "20px", borderRadius: "15px" }}
          />
        </div>
      )}
    </div>
  );
}

export default Home;
