import React, { useState } from "react";
import { useNavigate } from "react-router-dom";


function ChatBox({ placeholder = "Type your destination...", value, onChange, onSubmit }) {
  const [input, setInput] = useState(value ?? "");
  const navigate = useNavigate();

  // Keep input in sync with parent value
  React.useEffect(() => {
    if (value !== undefined && value !== input) setInput(value);
  }, [value]);

  const submit = () => {
    const q = (value !== undefined ? value : input).trim();
    if (q === "") return;
    if (onSubmit) onSubmit(q);
    else navigate("/results", { state: { query: q } });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") submit();
  };

  const handleChange = (e) => {
    setInput(e.target.value);
    if (onChange) onChange(e.target.value);
  };

  return (
    <div className="chatbox">
      <div className="chatbox-inner">
        <input
          className="search-input"
          type="text"
          placeholder={placeholder}
          value={value !== undefined ? value : input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <button className="search-btn" onClick={submit} aria-label="Search">Search</button>
      </div>
    </div>
  );
}

export default ChatBox;
