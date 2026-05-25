import { useState, useEffect } from "react";

export default function ProofHistory({ onSelectProof }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("proofHistory") || "[]");
    setHistory(stored);
  }, []);

  // Refresh history periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = JSON.parse(localStorage.getItem("proofHistory") || "[]");
      setHistory(stored);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (history.length === 0) return null;

  const getClaimLabel = (claim) => {
    switch (claim) {
      case "age_gte_18": return "Age ≥ 18";
      case "income_range": return "Income Range";
      case "aadhaar_valid": return "Aadhaar Valid";
      default: return claim;
    }
  };

  const getClaimEmoji = (claim) => {
    switch (claim) {
      case "age_gte_18": return "🎂";
      case "income_range": return "💰";
      case "aadhaar_valid": return "🪪";
      default: return "📄";
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const clearHistory = () => {
    localStorage.removeItem("proofHistory");
    setHistory([]);
  };

  return (
    <div className="proof-history max-w-container">
      <div className="proof-history-title" style={{ justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          📋 Proof History ({history.length})
        </span>
        <button
          onClick={clearHistory}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.7rem",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Clear
        </button>
      </div>
      <div className="proof-history-list">
        {history.slice(0, 5).map((item, i) => (
          <div
            key={i}
            className="proof-history-item"
            style={{ animationDelay: `${i * 50}ms`, animation: "slideUp 0.3s ease-out backwards" }}
          >
            <div className={`proof-history-icon ${item.isValid ? "success" : "fail"}`}>
              {getClaimEmoji(item.claim)}
            </div>
            <div className="proof-history-info">
              <div className="proof-history-claim">{getClaimLabel(item.claim)}</div>
              <div className="proof-history-time">
                {formatTime(item.timestamp)} · {item.mode === "real" ? "Real ZK" : "Demo"}
              </div>
            </div>
            <span className={`proof-history-status ${item.isValid ? "valid" : "invalid"}`}>
              {item.isValid ? "✓ Valid" : "✗ Invalid"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
