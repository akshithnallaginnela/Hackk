import { useState, useEffect } from "react";

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({
    credentials: 0,
    proofs: 0,
    lastActivity: null,
  });
  const [recentProofs, setRecentProofs] = useState([]);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    // Determine greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    // Load stats from localStorage
    const creds = JSON.parse(localStorage.getItem("myCredentials") || "[]");
    const proofs = JSON.parse(localStorage.getItem("proofHistory") || "[]");
    setStats({
      credentials: creds.length,
      proofs: proofs.length,
      lastActivity: proofs.length > 0 ? proofs[0].timestamp : null,
    });
    setRecentProofs(proofs.slice(0, 3));
  }, []);

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
    if (!timestamp) return "No activity yet";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="dashboard" style={{ animation: "fadeIn 0.5s ease-out" }}>
      {/* Dashboard Header */}
      <div className="dash-header">
        <div className="dash-greeting">
          <h1 className="dash-greeting-text">{greeting} 👋</h1>
          <p className="dash-greeting-sub">
            Your ZeroVault dashboard is ready. Manage credentials, generate proofs, and verify identities.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="dash-stats-grid">
        <div className="dash-stat-card" style={{ animationDelay: "0ms" }}>
          <div className="dash-stat-icon" style={{ background: "rgba(79, 70, 229, 0.08)", color: "var(--accent-primary)" }}>
            🪪
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">{stats.credentials}</span>
            <span className="dash-stat-label">Credentials</span>
          </div>
        </div>

        <div className="dash-stat-card" style={{ animationDelay: "80ms" }}>
          <div className="dash-stat-icon" style={{ background: "rgba(5, 150, 105, 0.08)", color: "var(--accent-emerald)" }}>
            🔐
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">{stats.proofs}</span>
            <span className="dash-stat-label">Proofs Generated</span>
          </div>
        </div>

        <div className="dash-stat-card" style={{ animationDelay: "160ms" }}>
          <div className="dash-stat-icon" style={{ background: "rgba(8, 145, 178, 0.08)", color: "var(--accent-cyan)" }}>
            ⏱️
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">{formatTime(stats.lastActivity)}</span>
            <span className="dash-stat-label">Last Activity</span>
          </div>
        </div>

        <div className="dash-stat-card" style={{ animationDelay: "240ms" }}>
          <div className="dash-stat-icon" style={{ background: "rgba(124, 58, 237, 0.08)", color: "var(--accent-violet)" }}>
            🤖
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">Active</span>
            <span className="dash-stat-label">Gemini Audit</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dash-section">
        <h2 className="dash-section-title">Quick Actions</h2>
        <div className="dash-actions-grid">
          <button
            className="dash-action-card"
            onClick={() => onNavigate("wallet")}
            style={{ animationDelay: "100ms" }}
          >
            <div className="dash-action-icon-wrap" style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M22 10H2"/>
              </svg>
            </div>
            <div className="dash-action-info">
              <span className="dash-action-title">My Wallet</span>
              <span className="dash-action-desc">Manage credentials & generate ZK proofs</span>
            </div>
            <span className="dash-action-arrow">→</span>
          </button>

          <button
            className="dash-action-card"
            onClick={() => onNavigate("verifier")}
            style={{ animationDelay: "200ms" }}
          >
            <div className="dash-action-icon-wrap" style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div className="dash-action-info">
              <span className="dash-action-title">Store Terminal</span>
              <span className="dash-action-desc">Verify ZK proofs in real-time via WebSocket</span>
            </div>
            <span className="dash-action-arrow">→</span>
          </button>

          <button
            className="dash-action-card"
            onClick={() => window.open("http://localhost:5175", "_blank")}
            style={{ animationDelay: "300ms" }}
          >
            <div className="dash-action-icon-wrap" style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18"/>
                <path d="M9 8h1"/>
                <path d="M9 12h1"/>
                <path d="M9 16h1"/>
                <path d="M14 8h1"/>
                <path d="M14 12h1"/>
                <rect x="5" y="2" width="14" height="19" rx="2"/>
              </svg>
            </div>
            <div className="dash-action-info">
              <span className="dash-action-title">Government Portal</span>
              <span className="dash-action-desc">Issue & sign identity credentials</span>
            </div>
            <span className="dash-action-arrow">↗</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      {recentProofs.length > 0 && (
        <div className="dash-section" style={{ animationDelay: "400ms" }}>
          <h2 className="dash-section-title">Recent Activity</h2>
          <div className="dash-activity-list">
            {recentProofs.map((proof, i) => (
              <div key={i} className="dash-activity-item" style={{ animationDelay: `${i * 60}ms` }}>
                <div className={`dash-activity-dot ${proof.isValid ? "success" : "fail"}`} />
                <div className="dash-activity-info">
                  <span className="dash-activity-claim">
                    {getClaimEmoji(proof.claim)} {getClaimLabel(proof.claim)}
                  </span>
                  <span className="dash-activity-meta">
                    {formatTime(proof.timestamp)} · {proof.mode === "real" ? "Real ZK" : "Demo"}
                  </span>
                </div>
                <span className={`dash-activity-badge ${proof.isValid ? "valid" : "invalid"}`}>
                  {proof.isValid ? "✓ Valid" : "✗ Failed"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it Works - condensed */}
      <div className="dash-section" style={{ animationDelay: "500ms" }}>
        <h2 className="dash-section-title">How ZeroVault Works</h2>
        <div className="dash-flow-steps">
          <div className="dash-flow-step">
            <div className="dash-flow-num" style={{ background: "rgba(79, 70, 229, 0.08)", color: "var(--accent-primary)", borderColor: "rgba(79, 70, 229, 0.15)" }}>1</div>
            <div className="dash-flow-content">
              <span className="dash-flow-icon">🏛️</span>
              <span className="dash-flow-label">Get credentials signed by the Government Portal</span>
            </div>
          </div>
          <div className="dash-flow-connector" />
          <div className="dash-flow-step">
            <div className="dash-flow-num" style={{ background: "rgba(124, 58, 237, 0.08)", color: "var(--accent-violet)", borderColor: "rgba(124, 58, 237, 0.15)" }}>2</div>
            <div className="dash-flow-content">
              <span className="dash-flow-icon">⚙️</span>
              <span className="dash-flow-label">Generate a ZK proof on your device — raw data never leaves</span>
            </div>
          </div>
          <div className="dash-flow-connector" />
          <div className="dash-flow-step">
            <div className="dash-flow-num" style={{ background: "rgba(5, 150, 105, 0.08)", color: "var(--accent-emerald)", borderColor: "rgba(5, 150, 105, 0.15)" }}>3</div>
            <div className="dash-flow-content">
              <span className="dash-flow-icon">📡</span>
              <span className="dash-flow-label">Verifier gets instant YES/NO over WebSockets</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
