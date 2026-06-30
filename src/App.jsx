import { useState } from "react";
import ProverWallet from "./components/ProverWallet";
import VerifierPortal from "./components/VerifierPortal";
import GeminiAssistant from "./components/GeminiAssistant";
import ProofHistory from "./components/ProofHistory";

export default function App() {
  const [activePage, setActivePage] = useState("wallet"); // wallet | verifier

  return (
    <>
      {/* Animated background */}
      <div className="app-background"></div>
      <div className="grid-pattern"></div>

      <div className="app-content">
        {/* Global Demo Hub Navigation Bar */}
        <nav className="global-nav">
          <div className="global-nav-brand">
            <span>🔐</span> Invisible Identity Wallet
          </div>
          <div className="global-nav-links">
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
          </div>
        </nav>

        {/* Master Header */}
        <header className="header" style={{ padding: "1.5rem 0 1rem" }}>
          <div className="header-badge">
            <span className="dot"></span>
            Real-time SSI Network
          </div>
          <h1 className="header-title" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
            <span className="lock-icon">🔐</span> Invisible Identity
          </h1>
          <p className="header-subtitle" style={{ fontSize: "0.95rem" }}>
            Prove who you are — without exposing what you are.
          </p>
        </header>

        {/* Active Portal Body */}
        <main style={{ animation: "fadeIn 0.3s ease-out" }} key={activePage}>
          {activePage === "wallet" && (
            <>
              <ProverWallet />
              <ProofHistory />
            </>
          )}
          {activePage === "verifier" && <VerifierPortal />}
        </main>

        {/* How it Works Flow */}
        <div className="flow-section" style={{ marginTop: "3rem" }}>
          <div className="flow-title">How Zero-Knowledge Verification Works</div>
          <div className="flow-grid">
            <div className="flow-step">
              <div className="flow-step-number">1</div>
              <div className="flow-step-icon">🏛️</div>
              <div className="flow-step-title">Government Sign</div>
              <div className="flow-step-desc">
                Visit the separate Government Identity Portal to get credentials signed.
              </div>
            </div>
            <div className="flow-step">
              <div className="flow-step-number">2</div>
              <div className="flow-step-icon">⚙️</div>
              <div className="flow-step-title">ZK Proof Generated</div>
              <div className="flow-step-desc">
                Your device generates a ZK proof verifying signature + claim age.
              </div>
            </div>
            <div className="flow-step">
              <div className="flow-step-number">3</div>
              <div className="flow-step-icon">📡</div>
              <div className="flow-step-title">Real-time Verify</div>
              <div className="flow-step-desc">
                Verifier gets YES/NO result instantly over WebSockets.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="footer" style={{ marginTop: "4rem" }}>
          <p>
            Built with 🔐 by <strong>Invisible Identity</strong> | 
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
