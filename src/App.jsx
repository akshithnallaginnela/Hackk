import { useState, useEffect } from "react";
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";
import ProverWallet from "./components/ProverWallet";
import VerifierPortal from "./components/VerifierPortal";
import GeminiAssistant from "./components/GeminiAssistant";
import ProofHistory from "./components/ProofHistory";
import Settings from "./components/Settings";
import TutorialWizard from "./components/TutorialWizard";
import ClaimSelector from "./components/ClaimSelector";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activePage, setActivePage] = useState("dashboard"); // dashboard | wallet | verifier | settings
  const [showTutorial, setShowTutorial] = useState(() => {
    return !localStorage.getItem("zerovault_token");
  });

  useEffect(() => {
    const token = localStorage.getItem("zerovault_token");
    const userEmail = localStorage.getItem("zerovault_user_email");
    if (token && userEmail) {
      setCurrentUser({ email: userEmail });
      setIsLoggedIn(true);
      setShowTutorial(false);
    }
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    if (user && user.email) {
      localStorage.setItem("zerovault_user_email", user.email);
    }
    setActivePage("dashboard");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem("zerovault_token");
    localStorage.removeItem("zerovault_user_email");
    setActivePage("dashboard");
  };

  if (!isLoggedIn) {
    if (showTutorial) {
      return (
        <TutorialWizard
          onComplete={handleLogin}
          onSkipToLogin={() => setShowTutorial(false)}
        />
      );
    } else {
      return (
        <AuthScreen
          onLogin={handleLogin}
        />
      );
    }
  }

  return (
    <>
      {/* Animated background */}
      <div className="app-background"></div>
      <div className="grid-pattern"></div>

      <div className="app-content">
        {/* Global Navigation Bar */}
        <nav className="global-nav">
          <div className="global-nav-brand" onClick={() => setActivePage("dashboard")} style={{ cursor: "pointer" }}>
            <span className="nav-brand-logo">
              <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
                <path d="M20 2L4 10V20C4 30 12 38 20 38C28 38 36 30 36 20V10L20 2Z" fill="url(#navShield)" stroke="rgba(79,70,229,0.3)" strokeWidth="1.5"/>
                <text x="20" y="25" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="Inter, sans-serif">ZV</text>
                <defs><linearGradient id="navShield" x1="4" y1="2" x2="36" y2="38"><stop stopColor="#4f46e5"/><stop offset="1" stopColor="#7c3aed"/></linearGradient></defs>
              </svg>
            </span>
            ZeroVault
          </div>
          <div className="global-nav-links">
            <button
              className={`global-nav-link ${activePage === "dashboard" ? "active" : ""}`}
              onClick={() => setActivePage("dashboard")}
            >
              🏠 Dashboard
            </button>
            <button
              className={`global-nav-link ${activePage === "wallet" ? "active" : ""}`}
              onClick={() => setActivePage("wallet")}
            >
              💼 My Wallet
            </button>
            <button
              className={`global-nav-link ${activePage === "verifier" ? "active" : ""}`}
              onClick={() => setActivePage("verifier")}
            >
              🍻 Store Terminal
            </button>
            <button
              className={`global-nav-link ${activePage === "settings" ? "active" : ""}`}
              onClick={() => setActivePage("settings")}
            >
              ⚙️ Settings
            </button>
            <button
              className="global-nav-link logout-btn"
              onClick={handleLogout}
              title="Lock vault"
            >
              🔒 Lock
            </button>
          </div>
        </nav>

        {/* Page Content */}
        <main style={{ animation: "fadeIn 0.3s ease-out" }} key={activePage}>
          {activePage === "dashboard" && (
            <Dashboard onNavigate={setActivePage} />
          )}

          {activePage === "wallet" && (
            <>
              {/* Sub-header */}
              <header className="header" style={{ padding: "1.5rem 0 1rem" }}>
                <div className="header-badge">
                  <span className="dot"></span>
                  Real-time SSI Network
                </div>
                <h1 className="header-title" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
                  <span className="lock-icon">💼</span> Prover Wallet
                </h1>
                <p className="header-subtitle" style={{ fontSize: "0.95rem" }}>
                  Import credentials and generate zero-knowledge proofs.
                </p>
              </header>
              <ProverWallet />
              <ProofHistory />
            </>
          )}

          {activePage === "verifier" && (
            <>
              <header className="header" style={{ padding: "1.5rem 0 1rem" }}>
                <div className="header-badge">
                  <span className="dot"></span>
                  Real-time SSI Network
                </div>
                <h1 className="header-title" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
                  <span className="lock-icon">🍻</span> Store Terminal
                </h1>
                <p className="header-subtitle" style={{ fontSize: "0.95rem" }}>
                  Verify ZK proofs in real-time. You never see the customer's raw data.
                </p>
              </header>
              <VerifierPortal />
            </>
          )}

          {activePage === "settings" && (
            <Settings user={currentUser} onUpdateUser={setCurrentUser} />
          )}
        </main>

        {/* Footer */}
        <footer className="footer" style={{ marginTop: "4rem" }}>
          <p>
            Built with 🔐 by <strong>ZeroVault</strong> | 
            100% Client-Side ZK | 
            ECDSA Signatures + WebSockets
          </p>
          <p style={{ marginTop: 6 }}>
            <a href="https://github.com/iden3/snarkjs" target="_blank" rel="noopener">
              snarkjs
            </a>{" "}
            ·{" "}
            <a href="https://ai.google.dev" target="_blank" rel="noopener">
              Gemini AI
            </a>
          </p>
        </footer>
      </div>

      {/* Floating AI Assistant */}
      <GeminiAssistant />
    </>
  );
}
