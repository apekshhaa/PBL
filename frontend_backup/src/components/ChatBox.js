import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function ChatBox() {
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && input.trim() !== "") {
      navigate("/results", { state: { query: input } });
    }
  };

  return (
    <div className="chatbox">
      <p className="chat-question">Hello, Where do you want to go today?</p>
      <input
        type="text"
        placeholder="Type your destination..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

export default ChatBox;
