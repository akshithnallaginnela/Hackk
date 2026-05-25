import { useState, useEffect, useRef } from "react";
import { detectFraudPattern } from "../utils/geminiClient";

export default function VerifierPortal() {
  const [sessionCode] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [wsStatus, setWsStatus] = useState("disconnected"); // disconnected | connecting | listening | client_connected
  const [logs, setLogs] = useState(["Initialising terminal..."]);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [fraudCheck, setFraudCheck] = useState(null);
  const [incomingProof, setIncomingProof] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    addLog("Connecting to WebSocket server...");
    setWsStatus("connecting");

    try {
      const socket = new WebSocket("ws://localhost:8080");
      wsRef.current = socket;

      socket.onopen = () => {
        // Register verifier to session
        socket.send(JSON.stringify({
          type: "register",
          role: "verifier",
          sessionId: sessionCode
        }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("📥 Verifier WS received:", data);

        if (data.type === "registered" && data.status === "success") {
          setWsStatus("listening");
          addLog(`Terminal online. Active Session Code: ${sessionCode}`);
          addLog("Waiting for customer wallet connection...");
        } else if (data.type === "prover_connected") {
          setWsStatus("client_connected");
          addLog("🟢 Customer wallet synced successfully.");
        } else if (data.type === "prover_disconnected") {
          setWsStatus("listening");
          addLog("🟡 Customer disconnected. Listening for connections...");
        } else if (data.type === "verification_result") {
          setVerifying(false);
          setIncomingProof({ claim: data.claim, mode: data.mode });
          setResult({ valid: data.valid, mode: data.mode, details: data.details });
          
          if (data.valid) {
            addLog(`✅ ZK Proof verified successfully! Claim: ${getClaimLabel(data.claim)}`);
          } else {
            addLog("❌ ZK Proof verification failed.");
          }

          // Trigger AI fraud checker
          runFraudCheck();
        } else if (data.type === "error") {
          addLog(`❌ Server error: ${data.message}`);
        }
      };

      socket.onclose = () => {
        setWsStatus("disconnected");
        addLog("🔴 Server connection closed.");
      };

      socket.onerror = () => {
        setWsStatus("disconnected");
        addLog("❌ Connection error. Is server running?");
      };

    } catch (err) {
      console.error(err);
      setWsStatus("disconnected");
      addLog("❌ Initialisation failed.");
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionCode]);

  const addLog = (msg) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runFraudCheck = async () => {
    try {
      const history = JSON.parse(localStorage.getItem("proofHistory") || "[]");
      if (history.length >= 2) {
        addLog("🤖 Analysing transaction history for fraud signals via Gemini...");
        const fraud = await detectFraudPattern(history);
        setFraudCheck(fraud);
        if (fraud.suspicious) {
          addLog(`⚠️ Gemini Fraud Signal: ${fraud.reason}`);
        } else {
          addLog("✓ Gemini Audit: No suspicious patterns detected.");
        }
      }
    } catch (err) {
      console.error("Fraud analysis failed:", err);
    }
  };

  const getClaimLabel = (claim) => {
    if (!claim) return "";
    switch (claim) {
      case "age_gte_18": return "Age ≥ 18";
      case "income_range": return "Income Range Check";
      case "aadhaar_valid": return "Aadhaar Validity Check";
      default: return claim;
    }
  };

  const resetTerminal = () => {
    setResult(null);
    setFraudCheck(null);
    setIncomingProof(null);
    addLog("Terminal reset. Waiting for new proofs...");
  };

  return (
    <div className="glass-card max-w-container" style={{ margin: "2rem auto" }}>
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div className="card-icon-title">
            <div className="card-icon verifier">✅</div>
            <h2 className="card-title">Merchant Verification Terminal</h2>
          </div>
          <p className="card-description">
            Confirm ZK proofs in real-time. You will never see the customer's raw credentials or personal details.
          </p>
        </div>

        {/* WS Connection Indicator */}
        <div className={`ws-indicator ${wsStatus === "client_connected" ? "connected" : wsStatus === "listening" ? "idle" : "disconnected"}`}>
          <span className="pulse-dot"></span>
          <span>
            {wsStatus === "client_connected" && "Synced"}
            {wsStatus === "listening" && "Listening"}
            {wsStatus === "connecting" && "Connecting..."}
            {wsStatus === "disconnected" && "Offline"}
          </span>
        </div>
      </div>

      {/* Terminal Sync Code display */}
      <div className="session-badge-container">
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Terminal Session Code:</span>
        <span className="session-badge">{sessionCode}</span>
      </div>

      {/* Incoming Proof Box */}
      {result ? (
        <div className={`verify-result ${result.valid ? "valid" : "invalid"}`}>
          <div className="verify-result-icon">
            {result.valid ? "✅" : "❌"}
          </div>
          <div className="verify-result-title">
            {result.valid ? "VALID — CLAIM CONFIRMED" : "INVALID — CHECK FAILED"}
          </div>
          <div className="verify-result-subtitle" style={{ marginBottom: 12 }}>
            {result.valid
              ? `The customer possesses a cryptographically valid credential for: ${getClaimLabel(incomingProof?.claim)}.`
              : "The presented proof is invalid or has been modified."}
          </div>

          {result.details && (
            <div className="verify-details" style={{ fontSize: "0.78rem" }}>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Verification Mode</span>
                <span className="verify-detail-value">{result.mode === "real" ? "Groth16 zk-SNARK" : "Concept Simulator"}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Government Signature</span>
                <span className="verify-detail-value" style={{ color: "var(--accent-emerald)" }}>{result.details.sigStatus || "Verified ✅"}</span>
              </div>
              {result.details.curve && (
                <div className="verify-detail-row">
                  <span className="verify-detail-label">Curve Protocol</span>
                  <span className="verify-detail-value">{result.details.curve} / {result.details.protocol}</span>
                </div>
              )}
            </div>
          )}

          <button onClick={resetTerminal} className="btn" style={{ marginTop: "1rem", background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-default)" }}>
            🔄 Clear & Ready
          </button>
        </div>
      ) : (
        <div className="status-box info" style={{ padding: "20px 16px" }}>
          <span className="status-icon">⏳</span>
          <div style={{ flex: 1 }}>
            <strong>Waiting for Customer ZK Proof submission...</strong>
            <div style={{ marginTop: 6, opacity: 0.8, fontSize: "0.8rem" }}>
              To sync: Open the Wallet page, enter session code <strong>{sessionCode}</strong>, select your claim, and submit.
            </div>
          </div>
        </div>
      )}

      {/* Fraud Alert Panel */}
      {fraudCheck && fraudCheck.suspicious && (
        <div className="status-box warning" style={{ marginTop: "1rem" }}>
          <span className="status-icon">⚠️</span>
          <div>
            <strong>AI Security Alert (Gemini Guard)</strong>
            <div style={{ marginTop: 4, opacity: 0.85 }}>
              {fraudCheck.reason}
            </div>
            {fraudCheck.riskLevel && (
              <div style={{ marginTop: 6 }}>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  background: "rgba(220, 38, 38, 0.08)",
                  color: "var(--accent-red)",
                }}>
                  Risk Level: {fraudCheck.riskLevel.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Terminal logs list */}
      <div style={{ marginTop: "1.5rem" }}>
        <label className="input-label">Terminal System Logs</label>
        <div style={{
          marginTop: 6,
          padding: 12,
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          height: "120px",
          overflowY: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: "0.7rem",
          color: "var(--text-secondary)",
          display: "flex",
          flexDirection: "column",
          gap: 4
        }}>
          {logs.map((log, i) => (
            <div key={i} style={{ wordBreak: "break-all" }}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
