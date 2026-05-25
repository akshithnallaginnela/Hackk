import { useState } from "react";
import ProverPortal from "./components/ProverPortal";
import VerifierPortal from "./components/VerifierPortal";
import GeminiAssistant from "./components/GeminiAssistant";
import ProofHistory from "./components/ProofHistory";

export default function App() {
  const [generatedProof, setGeneratedProof] = useState(null);
  const [activeTab, setActiveTab] = useState("prover");

  return (
    <>
      {/* Animated background */}
      <div className="app-background"></div>
      <div className="grid-pattern"></div>

      <div className="app-content">
        {/* Header */}
        <header className="header">
          <div className="header-badge">
            <span className="dot"></span>
            Zero-Knowledge Identity
          </div>
          <h1 className="header-title">
            <span className="lock-icon">🔐</span> Invisible Identity
          </h1>
          <p className="header-subtitle">
            Prove who you are — without exposing what you are.
          </p>
          <div className="header-tech-stack">
            ⚡ ZK Proofs (Groth16) + Gemini AI + React
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="tab-nav">
          <button
            className={`tab-btn ${activeTab === "prover" ? "active" : ""}`}
            onClick={() => setActiveTab("prover")}
          >
            <span className="tab-icon">👤</span>
            I am the User
          </button>
          <button
            className={`tab-btn ${activeTab === "verifier" ? "active" : ""}`}
            onClick={() => setActiveTab("verifier")}
          >
            <span className="tab-icon">🏢</span>
            I am the Verifier
          </button>
        </nav>

        {/* Active Portal */}
        <div style={{ animation: "fadeIn 0.3s ease-out" }} key={activeTab}>
          {activeTab === "prover" && (
            <ProverPortal onProofGenerated={setGeneratedProof} />
          )}
          {activeTab === "verifier" && (
            <VerifierPortal incomingProof={generatedProof} />
          )}
        </div>

        {/* Proof History */}
        <ProofHistory />

        {/* How it Works Flow */}
        <div className="flow-section">
          <div className="flow-title">How Zero-Knowledge Verification Works</div>
          <div className="flow-grid">
            <div className="flow-step">
              <div className="flow-step-number">1</div>
              <div className="flow-step-icon">🧑</div>
              <div className="flow-step-title">User inputs data</div>
              <div className="flow-step-desc">
                Private data stays on your device — never transmitted
              </div>
            </div>
            <div className="flow-step">
              <div className="flow-step-number">2</div>
              <div className="flow-step-icon">⚙️</div>
              <div className="flow-step-title">ZK Proof generated</div>
              <div className="flow-step-desc">
                Groth16 circuit proves the claim mathematically
              </div>
            </div>
            <div className="flow-step">
              <div className="flow-step-number">3</div>
              <div className="flow-step-icon">✅</div>
              <div className="flow-step-title">Verifier checks</div>
              <div className="flow-step-desc">
                Gets YES/NO — never sees your actual data
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="footer">
          <p>
            Built with 🔐 by <strong>Invisible Identity</strong> | 
            100% Open Source | 
            ZK Proofs + Gemini AI
          </p>
          <p style={{ marginTop: 4 }}>
            <a href="https://github.com" target="_blank" rel="noopener">
              Circom
            </a>{" "}
            ·{" "}
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
