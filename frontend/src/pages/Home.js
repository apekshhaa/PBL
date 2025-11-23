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

import React, { useEffect, useRef, useState } from "react";
import ChatBox from "../components/ChatBox";
// import Shuffle from "../components/Shuffle"; // removed usage — kept here if you want to re-enable
import { useNavigate } from "react-router-dom";
import Galaxy from "../components/Galaxy";
import AnimatedList from "../components/AnimatedList";
import FlowingMenu from "../components/FlowingMenu";
// use local images from src/images for suggestion thumbnails
import libImg from "../images/library.jpeg";
import cafeImg from "../images/cafeteria.jpeg";
import canteenImg from "../images/cafeteria.jpeg";
import auditoriumImg from "../images/auditorium.jpeg";
import adminImg from "../images/admin.jpeg";
import ScrollFloat from "../components/ScrollFloat";
import TextPressure from '../components/TextPressure';
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "../components/ScrollFloat.css";

gsap.registerPlugin(ScrollTrigger);

function Home() {
// import MagicBento from '../components/MagicBento';

  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");

  // sample images for suggestions (replace with your own assets if available)
  const suggestionItems = [
    { text: 'Library', link: '/results', image: libImg },
    { text: 'Cafe', link: '/results', image: cafeImg },
    { text: 'Canteen', link: '/results', image: canteenImg },
    { text: 'Auditorium', link: '/results', image: auditoriumImg, subItems: ['Prerna Hall', 'Spoorthi Hall', 'Kalam Auditorium', 'Fr Fred'] },
    { text: 'Admin Block', link: '/results', image: adminImg }
  ];

  // When a suggestion is clicked, set search bar and navigate
  const handleSuggestionSelect = (place) => {
    setSearchValue(place);
    navigate("/results", { state: { query: place } });
  };

  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const sEl = searchRef.current;
    const sugEl = suggestionsRef.current;
    if (!sEl || !sugEl) return;

    // Initial state
    gsap.set([sEl, sugEl], { opacity: 0, y: 20, autoAlpha: 0 });

    // reveal search bar first, then suggestions, as the user scrolls
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sEl,
        start: 'top 80%',
        end: 'bottom 30%',
        scrub: false,
        toggleActions: 'play none none reverse'
      }
    });

    tl.to(sEl, { opacity: 1, y: 0, autoAlpha: 1, duration: 0.6, ease: 'power2.out' })
      .to(sugEl, { opacity: 1, y: 0, autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, '>-0.2');

    return () => {
      if (tl) tl.kill();
    };
  }, []);

  return (
    <div className="home">
      {/* Full-viewport Galaxy background (behind UI). pointerEvents none keeps UI interactive */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <Galaxy
          mouseRepulsion={true}
          mouseInteraction={true}
          density={1.2}
          glowIntensity={0.45}
          saturation={0.0} /* force white stars */
          hueShift={0}
          colorTint={[1.0, 1.0, 1.0]} /* ensure white */
          transparent={true}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div className="home-card" style={{ position: 'relative', zIndex: 1, background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minHeight: 'calc(100vh - 120px)', padding: '20px 40px' }}>
        <div className="hero-center" style={{ width: '100%', textAlign: 'center' }}>
          {/* Reveal heading using ScrollFloat — this animates per-char while scrolled */}
          {/* <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
             <ScrollFloat containerClassName="home-heading" textClassName="home-heading-text" animationDuration={0.85} stagger={0.02}>
              Want to Find places on campus  Here you Go!!
            </ScrollFloat> 
            
          </div> */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <TextPressure
              text="hello, where do u want to go today?"
              fontFamily="Compressa VF"
              fontUrl="https://res.cloudinary.com/dr6lvwubh/raw/upload/v1529908256/CompressaPRO-GX.woff2"
              scale={true}
              flex={true}
              stroke={false}
              textColor="#e6d9ff"
              minFontSize={28}
              className="home-heading-text"
            />
          </div>

          {/* Search/chat moved to top */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }} ref={searchRef}>
            <ChatBox value={searchValue} onChange={setSearchValue} />
          </div>

          <div className="suggestions" style={{ marginTop: 18 }} ref={suggestionsRef}>
            <h3 style={{ marginBottom: 8, color: '#e6d9ff' }}>Suggestions:</h3>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <FlowingMenu items={suggestionItems} onSelect={handleSuggestionSelect} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
