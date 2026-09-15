import { useState, useEffect } from "react";

const FACTS = [
  "The first computer bug was an actual moth found in a Harvard Mark II relay in 1947.",
  "The term 'Hello, World!' program tradition traces back to a 1972 Bell Labs memo by Brian Kernighan.",
  "Git was created by Linus Torvalds in about ten days in 2005.",
  "The average sprint length in Scrum is two weeks, though it can range from one to four.",
  "JavaScript was written in just 10 days in 1995 by Brendan Eich.",
  "The word 'debugging' predates computers — Thomas Edison used it in 1878.",
];

const GREETINGS = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  night: "Working late, huh",
};

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return GREETINGS.night;
  if (hour < 12) return GREETINGS.morning;
  if (hour < 17) return GREETINGS.afternoon;
  if (hour < 21) return GREETINGS.evening;
  return GREETINGS.night;
}

export default function App() {
  const [name, setName] = useState("");
  const [clicks, setClicks] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const [greeting] = useState(getTimeGreeting());

  useEffect(() => {
    document.title = clicks > 0 ? `Clicked ${clicks}x` : "Hello, Sprint 1";
  }, [clicks]);

  const handleGreet = () => {
    setClicks((c) => c + 1);
    setFactIndex((i) => (i + 1) % FACTS.length);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f172a",
      fontFamily: "system-ui, sans-serif",
      padding: "1.5rem",
    }}>
      <div style={{
        background: "#1e293b",
        borderRadius: "16px",
        padding: "2.5rem",
        maxWidth: "420px",
        width: "100%",
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        color: "#e2e8f0",
      }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem", fontWeight: 700 }}>
          {greeting}{name ? `, ${name}` : ""} 👋
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
          Hello World, but make it interesting.
        </p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What's your name?"
          style={{
            width: "100%",
            padding: "0.6rem 0.8rem",
            borderRadius: "8px",
            border: "1px solid #334155",
            background: "#0f172a",
            color: "#e2e8f0",
            marginBottom: "1rem",
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={handleGreet}
          style={{
            width: "100%",
            padding: "0.7rem",
            borderRadius: "8px",
            border: "none",
            background: "#6366f1",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: "1.25rem",
          }}
        >
          Give me a fact ({clicks} click{clicks === 1 ? "" : "s"})
        </button>

        <div style={{
          background: "#0f172a",
          borderRadius: "8px",
          padding: "1rem",
          fontSize: "0.9rem",
          lineHeight: 1.5,
          border: "1px solid #334155",
        }}>
          {clicks === 0
            ? "Click the button above to learn a little dev-history trivia."
            : FACTS[factIndex]}
        </div>

        <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#64748b", textAlign: "center" }}>
          Built with React &middot; state, effects, and events &middot; ready for Sprint 1
        </p>
      </div>
    </div>
  );
}
