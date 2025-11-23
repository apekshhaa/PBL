/*import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
*/

/*import React from "react";
import { Routes, Route } from "react-router-dom";
import Background from "./components/Background";
import Background from "./components/Background";
import Background from "./components/Background";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import About from "./pages/About";
import Results from "./pages/Results";
import bgImage from "./images/bgS.jpeg";

function App() {
  return (
    <div
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center center",
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        color: "white", // ensures text is visible

      }}
    >
      <Navbar />
      <div style={{ flex: 1, paddingTop: "80px" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
*/

import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
// import Background from "./components/Background";
import Home from "./pages/Home";
import About from "./pages/About";
import Results from "./pages/Results";
import Coverage from "./pages/Coverage";
import NetworkCoverage from "./pages/NetworkCoverage";

function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        margin: 0,
        display: "flex",
        flexDirection: "column",
        color: "white",
        backgroundColor: "#000",
      }}
    >
      {/* <Background /> */}
      <Navbar />
      <div style={{ flex: 1, paddingTop: "80px" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/results" element={<Results />} />
          <Route path="/coverage" element={<Coverage />} />
          <Route path="/network" element={<NetworkCoverage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;




