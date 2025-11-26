import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import FloatingLines from '../components/FloatingLines';

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // 'student' | 'visitor'
  const [identifier, setIdentifier] = useState(""); 
  const [error, setError] = useState("");

  // -------------------------------
  // SJEC Email Validation Function
  // -------------------------------
  const validateSJECEmail = (email) => {
    const sjecRegex = /^[a-zA-Z0-9._%+-]+@sjec\.ac\.in$/;
    return sjecRegex.test(email);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    // -------------------------------
    // STUDENT / TEACHER VALIDATION
    // -------------------------------
    if (mode === "student") {
      if (!identifier) {
        setError("Please enter your SJEC email.");
        return;
      }

      if (!validateSJECEmail(identifier)) {
        setError("Only @sjec.ac.in email addresses are allowed.");
        return;
      }
    }

    // -------------------------------
    // VISITOR VALIDATION
    // -------------------------------
    else if (mode === "visitor") {
      if (!identifier) {
        setError("Please enter your name.");
        return;
      }
    }

    // If no mode selected
    else {
      setError("Please choose Student/Teacher or Visitor.");
      return;
    }

    // Save user info locally
    const user = {
      mode,
      identifier,
    };

    try {
      localStorage.setItem("smartcampus_user", JSON.stringify(user));
    } catch (e) {
      console.warn("Local storage error:", e);
    }

    // Log to backend (non-blocking)
    try {
      fetch('http://localhost:5000/api/logins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: user.mode,
          identifier: user.identifier,
          time: new Date().toISOString(),
        }),
      }).catch((err) => console.warn('Login log failed:', err));
    } catch (err) {
      console.warn('Logging exception:', err);
    }

    navigate("/home");
  };

  return (
    <div className="login-root">
      <div className="login-background" />
      
      <div className="floating-lines-fullscreen">
        <FloatingLines
          enabledWaves={['top', 'middle', 'bottom']}
          lineCount={[10, 15, 20]}
          lineDistance={[8, 6, 4]}
          bendRadius={5.0}
          bendStrength={-0.5}
          interactive={true}
          parallax={true}
        />
      </div>

      <div className="login-card">
        <h1 className="login-title">Welcome to Smart Campus</h1>
        <p className="login-sub">Choose how you'd like to sign in</p>

        <div className="options">
          <button
            className={`option-btn ${mode === "student" ? "active" : ""}`}
            onClick={() => {
              setMode("student");
              setIdentifier("");
              setError("");
            }}
          >
            Student / Teacher
          </button>

          <button
            className={`option-btn ${mode === "visitor" ? "active" : ""}`}
            onClick={() => {
              setMode("visitor");
              setIdentifier("");
              setError("");
            }}
          >
            Visitor
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          
          {/* Student / Teacher */}
          {mode === "student" && (
            <>
              <label className="field-label">SJEC Email</label>
              <input
                type="email"
                className="field-input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="example@sjec.ac.in"
              />
            </>
          )}

          {/* Visitor */}
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

          {/* Error Message */}
          {error && <div className="error">{error}</div>}

          <div className="actions">
            <button type="submit" className="submit-btn">Enter Campus</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
