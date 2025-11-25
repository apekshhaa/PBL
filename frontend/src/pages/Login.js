import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // 'student' | 'visitor'
  const [identifier, setIdentifier] = useState(""); // single field for username or USN or visitor name
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (mode === "student") {
      if (!identifier) {
        setError("Please enter USN or username.");
        return;
      }
    } else if (mode === "visitor") {
      if (!identifier) {
        setError("Please enter your name.");
        return;
      }
    } else {
      setError("Please choose Student/Teacher or Visitor.");
      return;
    }

    // Persist user info
    const user = {
      mode,
      identifier,
    };
    try {
      localStorage.setItem("smartcampus_user", JSON.stringify(user));
    } catch (e) {
      // ignore storage errors
    }

    // send to backend logging endpoint (non-blocking)
    try {
      fetch('http://localhost:5000/api/logins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: user.mode, identifier: user.identifier, time: new Date().toISOString() }),
      }).catch((err) => console.warn('Login log failed:', err));
    } catch (err) {
      console.warn('Login log exception:', err);
    }

    navigate("/home");
  };

  return (
    <div className="login-root">
      <div className="login-background" />
      <div className="login-card">
        <h1 className="login-title">Welcome to Smart Campus</h1>
        <p className="login-sub">Choose how you'd like to sign in</p>

        <div className="options">
          <button
            className={`option-btn ${mode === "student" ? "active" : ""}`}
            onClick={() => setMode("student")}
          >
            Student / Teacher
          </button>
          <button
            className={`option-btn ${mode === "visitor" ? "active" : ""}`}
            onClick={() => setMode("visitor")}
          >
            Visitor
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === "student" && (
            <>
              <label className="field-label">USN / Username</label>
              <input
                className="field-input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter USN or Username"
              />
            </>
          )}

          {mode === "visitor" && (
            <>
              <label className="field-label">Name</label>
              <input
                className="field-input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your name"
              />
            </>
          )}

          {error && <div className="error">{error}</div>}

          <div className="actions">
            <button type="submit" className="submit-btn">Enter Campus</button>
          </div>

          <div className="help-text">You can change this later in profile.</div>
        </form>
      </div>
    </div>
  );
}

export default Login;
