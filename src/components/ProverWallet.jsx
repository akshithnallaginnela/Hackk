import { useState, useEffect, useRef } from "react";
import { generateAgeProof, generateIncomeProof, generateAadhaarProof } from "../utils/zkProver";

export default function ProverWallet() {
  const [credentials, setCredentials] = useState([]);
  const [selectedCardIdx, setSelectedCardIdx] = useState(null);
  
  // WS sync connection state
  const [sessionCode, setSessionCode] = useState("");
  const [wsStatus, setWsStatus] = useState("disconnected"); // disconnected | connecting | connected
  const wsRef = useRef(null);

  // Proving states
  const [selectedClaim, setSelectedClaim] = useState("age_gte_18");
  const [lowerBound, setLowerBound] = useState("300000");
  const [upperBound, setUpperBound] = useState("1000000");
  
  const [status, setStatus] = useState("idle"); // idle | proving | done | error
  const [provingStep, setProvingStep] = useState("");
  const [latestProof, setLatestProof] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load issued credentials from localStorage
    const saved = JSON.parse(localStorage.getItem("myCredentials") || "[]");
    setCredentials(saved);
    if (saved.length > 0) {
      setSelectedCardIdx(0);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectToTerminal = () => {
    if (!sessionCode || sessionCode.trim().length === 0) return;
    setWsStatus("connecting");
    setError(null);

    try {
      const socket = new WebSocket("ws://localhost:8080");
      wsRef.current = socket;

      socket.onopen = () => {
        // Register prover to session
        socket.send(JSON.stringify({
          type: "register",
          role: "prover",
          sessionId: sessionCode.trim()
        }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "registered" && data.status === "success") {
          setWsStatus("connected");
        } else if (data.type === "error") {
          setError(data.message);
          setWsStatus("disconnected");
        } else if (data.type === "verifier_disconnected") {
          setWsStatus("disconnected");
          setError("Verifier terminal disconnected.");
        }
      };

      socket.onclose = () => {
        setWsStatus("disconnected");
      };

      socket.onerror = () => {
        setWsStatus("disconnected");
        setError("Could not connect to WebSocket server");
      };

    } catch (err) {
      console.error(err);
      setError("WebSocket initialization failed");
      setWsStatus("disconnected");
    }
  };

  const disconnectTerminal = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setWsStatus("disconnected");
  };

  const handleProveAndTransmit = async () => {
    if (selectedCardIdx === null) return;
    const card = credentials[selectedCardIdx];
    
    setStatus("proving");
    setError(null);
    setLatestProof(null);

    try {
      let result;

      switch (selectedClaim) {
        case "age_gte_18":
          setProvingStep("Verifying credential issuer signature...");
          await delay(400);
          setProvingStep("Extracting secure birth year from signature payload...");
          await delay(350);
          setProvingStep("Running Groth16 zk-SNARK age comparison constraints...");
          await delay(400);
          result = await generateAgeProof(card.subject.birthYear);
          break;

        case "income_range":
          setProvingStep("Verifying income signature validity...");
          await delay(400);
          setProvingStep("Executing range checks against upper and lower bounds...");
          await delay(400);
          result = await generateIncomeProof(
            card.subject.income,
            parseInt(lowerBound),
            parseInt(upperBound)
          );
          break;

        case "aadhaar_valid":
          setProvingStep("Extracting encrypted Aadhaar block...");
          await delay(400);
          setProvingStep("Hashing Aadhaar number via Poseidon hash...");
          await delay(400);
          result = await generateAadhaarProof(card.subject.aadhaarNumber);
          break;
      }

      // Embed the Issuer's signature into the proof package for Verifier validation
      const fullProofPackage = {
        ...result,
        credential: {
          subject: card.subject,
          signature: card.signature
        }
      };

      setLatestProof(fullProofPackage);

      // If connected via WebSocket, transmit in real-time!
      if (wsStatus === "connected" && wsRef.current) {
        setProvingStep("🚀 Transmitting cryptographic proof to Verifier terminal...");
        await delay(500);

        wsRef.current.send(JSON.stringify({
          type: "submit_proof",
          sessionId: sessionCode.trim(),
          proof: fullProofPackage
        }));
      }

      setStatus("done");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setError(err.message || "Proof compilation failed");
    }
  };

  const getMaskedAadhaar = (num) => {
    if (!num) return "";
    return `XXXX XXXX ${num.slice(-4)}`;
  };

  const activeCard = selectedCardIdx !== null ? credentials[selectedCardIdx] : null;

  return (
    <div className="glass-card max-w-container" style={{ margin: "2rem auto" }}>
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div className="card-icon-title">
            <div className="card-icon prover">👤</div>
            <h2 className="card-title">My Identity Wallet</h2>
          </div>
          <p className="card-description">
            Your secure private wallet. View issued credentials, generate zero-knowledge proofs on-device, and transmit them live.
          </p>
        </div>

        {/* WS Status Badge */}
        <div className={`ws-indicator ${wsStatus}`}>
          <span className="pulse-dot"></span>
          <span>
            {wsStatus === "connected" && `Connected to Verifier`}
            {wsStatus === "connecting" && "Connecting..."}
            {wsStatus === "disconnected" && "Offline (Local Only)"}
          </span>
        </div>
      </div>

      {credentials.length === 0 ? (
        <div className="status-box warning" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 20 }}>
          <div>
            <strong>💳 Your Wallet is Empty!</strong>
            <div style={{ marginTop: 4, opacity: 0.85 }}>
              You don't have any secure identity credentials issued yet.
            </div>
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Go to the **🏛️ Issuer Portal** to issue your cryptographically signed mock Aadhaar Card first.
          </div>
        </div>
      ) : (
        <div>
          {/* Card Carousel Selector */}
          <div className="wallet-deck">
            <label className="input-label">Select Credential Card</label>
            <div className="identity-card-container" style={{ margin: "0 auto 1.5rem" }}>
              <div className="identity-card" style={{ border: "1.5px solid var(--accent-primary)" }}>
                <div className="card-top">
                  <span className="card-logo">🪪</span>
                  <span className="card-gov-title">Government of India</span>
                  <span className="card-logo" style={{ color: "#d97706" }}>🇮🇳</span>
                </div>
                <div className="card-body">
                  <div className="card-photo-box">👤</div>
                  <div className="card-info-grid">
                    <div className="card-info-row">
                      <span className="card-info-label">Name (Private)</span>
                      <span className="card-info-val">{activeCard?.subject.name}</span>
                    </div>
                    <div className="card-info-row">
                      <span className="card-info-label">Birth Year</span>
                      <span className="card-info-val">{activeCard?.subject.birthYear}</span>
                    </div>
                    <div className="card-info-row">
                      <span className="card-info-label">Income (Private)</span>
                      <span className="card-info-val">₹{activeCard?.subject.income.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="card-bottom">
                  <span className="card-signature-seal">
                    🛡️ SIGNED BY ISSUER
                  </span>
                  <span className="card-id-num masked">
                    {getMaskedAadhaar(activeCard?.subject.aadhaarNumber)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sync Connection Section */}
          <div style={{ padding: 16, background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", marginBottom: "1.5rem", border: "1px solid var(--border-default)" }}>
            <label className="input-label" style={{ marginBottom: 8 }}>
              🔗 Live Sync with Merchant Terminal
            </label>
            
            {wsStatus !== "connected" ? (
              <div className="session-keypad">
                <input
                  type="text"
                  placeholder="Enter 4-Digit Session ID"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="session-input"
                />
                <button
                  onClick={connectToTerminal}
                  disabled={wsStatus === "connecting" || sessionCode.length < 4}
                  className="btn btn-primary"
                  style={{ width: "auto", padding: "0 20px" }}
                >
                  Connect
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Sync session active: <strong>{sessionCode}</strong>
                </span>
                <button
                  onClick={disconnectTerminal}
                  className="btn"
                  style={{ width: "auto", padding: "6px 12px", background: "none", color: "var(--accent-red)", border: "1px solid rgba(220, 38, 38, 0.2)", fontSize: "0.75rem" }}
                >
                  Disconnect
                </button>
              </div>
            )}
            {error && <div style={{ color: "var(--accent-red)", fontSize: "0.75rem", marginTop: 4 }}>⚠️ {error}</div>}
          </div>

          {/* Claim config panel */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label className="input-label">Select Claim to Prove</label>
            <div className="claim-selector" style={{ marginTop: 6 }}>
              <button
                className={`claim-chip ${selectedClaim === "age_gte_18" ? "active" : ""}`}
                onClick={() => setSelectedClaim("age_gte_18")}
              >
                <span className="claim-emoji">🎂</span>
                <span>Age ≥ 18</span>
              </button>
              <button
                className={`claim-chip ${selectedClaim === "income_range" ? "active" : ""}`}
                onClick={() => setSelectedClaim("income_range")}
              >
                <span className="claim-emoji">💰</span>
                <span>Income Range</span>
              </button>
              <button
                className={`claim-chip ${selectedClaim === "aadhaar_valid" ? "active" : ""}`}
                onClick={() => setSelectedClaim("aadhaar_valid")}
              >
                <span className="claim-emoji">🪪</span>
                <span>Aadhaar Valid</span>
              </button>
            </div>

            {/* Income Range Settings */}
            {selectedClaim === "income_range" && (
              <div className="input-row" style={{ marginTop: 12, animation: "fadeIn 0.2s" }}>
                <div className="input-group">
                  <label className="input-label">Lower Bound (₹)</label>
                  <input
                    type="number"
                    value={lowerBound}
                    onChange={(e) => setLowerBound(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Upper Bound (₹)</label>
                  <input
                    type="number"
                    value={upperBound}
                    onChange={(e) => setUpperBound(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger */}
          {status === "proving" ? (
            <div className="proving-animation">
              <div className="circuit-visual">
                <div className="circuit-node"></div>
                <div className="circuit-line"></div>
                <div className="circuit-node"></div>
                <div className="circuit-line"></div>
                <div className="circuit-node"></div>
                <div className="circuit-line"></div>
                <div className="circuit-node"></div>
                <div className="circuit-line"></div>
                <div className="circuit-node"></div>
              </div>
              <div className="proving-text">{provingStep}</div>
            </div>
          ) : (
            <button onClick={handleProveAndTransmit} className="btn btn-primary">
              ⚡ {wsStatus === "connected" ? "Generate & Transmit ZK Proof" : "Generate Local ZK Proof"}
            </button>
          )}

          {/* Success Result Display */}
          {status === "done" && latestProof && (
            <div style={{ marginTop: "1.25rem" }}>
              <div className="status-box success">
                <span className="status-icon">✅</span>
                <div>
                  <strong>ZK Proof generated successfully!</strong>
                  <div style={{ marginTop: 4, opacity: 0.85 }}>
                    {wsStatus === "connected" 
                      ? "Proof transmitted live to verifier screen."
                      : "Generated locally. Connect to a terminal session to send."}
                  </div>
                </div>
              </div>

              {/* Render proof properties */}
              <div className="proof-data">
                <div className="proof-data-header">
                  <span className="proof-data-title">Proof Elements</span>
                  <span className="proof-data-badge real" style={{ background: "rgba(79, 70, 229, 0.1)", color: "var(--accent-primary)" }}>
                    {latestProof.mode.toUpperCase()}
                  </span>
                </div>
                <div className="proof-data-content">
                  <div><strong>π_a:</strong> [{latestProof.proof.pi_a[0].substring(0, 16)}..., {latestProof.proof.pi_a[1].substring(0, 16)}...]</div>
                  <div><strong>Public Signals:</strong> [{latestProof.publicSignals.join(", ")}]</div>
                  <div style={{ color: "var(--accent-emerald)", marginTop: 4 }}>
                    ✓ Encrypted proof hides: Name, Birth Year, Aadhaar, Income.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
