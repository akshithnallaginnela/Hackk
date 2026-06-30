import { useState, useEffect, useRef } from "react";

// Dynamically resolve backend URLs (falls back to localhost for development)
const getBackendUrls = () => {
  const backendBase = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
  const wsProto = backendBase.startsWith("https") ? "wss" : "ws";
  const wsHost = backendBase.replace(/^https?:\/\//, "");
  return {
    http: backendBase,
    ws: `${wsProto}://${wsHost}`
  };
};
const BACKEND_URLS = getBackendUrls();

export default function App() {
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [income, setIncome] = useState("");
  
  const [issuedCredential, setIssuedCredential] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // WS sync connection state
  const [sessionCode] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [wsStatus, setWsStatus] = useState("disconnected"); // disconnected | connecting | listening | connected
  const wsRef = useRef(null);

  const [copied, setCopied] = useState(false);
  const [pushedStatus, setPushedStatus] = useState(null); // null | sending | success | error

  const connectToWalletSession = () => {
    if (!sessionCode) return;
    setWsStatus("connecting");
    setError(null);

    try {
      const socket = new WebSocket(BACKEND_URLS.ws);
      wsRef.current = socket;

      socket.onopen = () => {
        // Register issuer to session
        socket.send(JSON.stringify({
          type: "register",
          role: "issuer",
          sessionId: sessionCode
        }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "registered" && data.status === "success") {
          setWsStatus("listening");
        } else if (data.type === "prover_connected") {
          setWsStatus("connected");
        } else if (data.type === "prover_disconnected") {
          setWsStatus("listening");
        } else if (data.type === "error") {
          setError(data.message);
          setWsStatus("disconnected");
        }
      };

      socket.onclose = () => {
        setWsStatus("disconnected");
      };

      socket.onerror = () => {
        setWsStatus("disconnected");
        setError("Could not connect to sync server");
      };

    } catch (err) {
      console.error(err);
      setError("WebSocket initialization failed");
      setWsStatus("disconnected");
    }
  };

  const disconnectSession = () => {
    if (wsRef.current) wsRef.current.close();
    setWsStatus("disconnected");
  };

  useEffect(() => {
    connectToWalletSession();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [sessionCode]);

  const handleIssue = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCopied(false);
    setPushedStatus(null);

    if (aadhaarNumber.length !== 12) {
      setError("Aadhaar must be exactly 12 digits");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URLS.http}/api/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          birthYear: parseInt(birthYear),
          aadhaarNumber,
          income: parseInt(income)
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate credential signature");
      }

      const data = await response.json();
      setIssuedCredential(data);

      // If prover wallet is connected live via WebSockets, push the credential automatically!
      if (wsStatus === "connected" && wsRef.current) {
        setPushedStatus("sending");
        wsRef.current.send(JSON.stringify({
          type: "issue_credential",
          sessionId: sessionCode.trim(),
          credential: data
        }));
        setPushedStatus("success");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong during issuance");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!issuedCredential) return;
    try {
      const token = btoa(unescape(encodeURIComponent(JSON.stringify(issuedCredential))));
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Token encoding failed:", err);
    }
  };

  const getMaskedAadhaar = (num) => {
    if (!num) return "";
    return `XXXX XXXX ${num.slice(-4)}`;
  };

  return (
    <>
      <div className="app-background"></div>

      <div className="app-content">
        <header className="gov-header">
          <div className="gov-emblem">🏛️</div>
          <h1 className="gov-title">Government Identity Portal</h1>
          <p className="gov-subtitle">Ministry of Electronics & IT · India</p>
        </header>

        <div className="glass-card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div>
              <h2 className="card-title">UIDAI Aadhaar Issuance Terminal</h2>
              <p className="card-description">Verify details and issue cryptographically signed Verifiable Credentials for local browser wallets.</p>
            </div>

            {/* Sync Status Badge */}
            <div className={`ws-indicator ${wsStatus === "connected" ? "connected" : wsStatus === "listening" ? "connecting" : "disconnected"}`}>
              <span className="pulse-dot"></span>
              <span>
                {wsStatus === "connected" && "Synced to Wallet"}
                {wsStatus === "listening" && "Waiting for Wallet..."}
                {wsStatus === "connecting" && "Connecting..."}
                {wsStatus === "disconnected" && "Offline (Copy-Paste Mode)"}
              </span>
            </div>
          </div>

          {/* Sync Code Keypad */}
          <div style={{ padding: 14, background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", marginBottom: "1.5rem", border: "1px solid var(--border-default)" }}>
            <label className="input-label" style={{ marginBottom: 8 }}>
              🔗 Live Sync with Customer Wallet app
            </label>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
              <span>
                Sync Session ID: <strong style={{ color: "var(--accent-emerald)", fontSize: "1.1rem", fontFamily: "var(--font-mono)", padding: "2px 8px", background: "rgba(16, 185, 129, 0.1)", borderRadius: 4, marginLeft: 4 }}>{sessionCode}</strong>
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {wsStatus === "connected" && <span style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>🟢 Synced</span>}
                {wsStatus === "listening" && <span style={{ color: "var(--text-secondary)" }}>⏳ Waiting...</span>}
                {wsStatus === "connecting" && <span style={{ color: "var(--text-secondary)" }}>⚡ Connecting...</span>}
                {wsStatus === "disconnected" && (
                  <button 
                    onClick={connectToWalletSession} 
                    className="btn btn-primary" 
                    style={{ padding: "4px 10px", fontSize: "0.7rem", width: "auto" }}
                  >
                    Reconnect
                  </button>
                )}
              </div>
            </div>
            {error && <div style={{ color: "red", fontSize: "0.72rem", marginTop: 6 }}>⚠️ {error}</div>}
          </div>

          {!issuedCredential ? (
            <form onSubmit={handleIssue} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {error && (
                <div className="status-box error">
                  <span className="status-icon">❌</span>
                  <div>{error}</div>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Akshith Nallaginnela"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label className="input-label">Birth Year</label>
                  <input
                    type="number"
                    placeholder="e.g. 2000"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Annual Income (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 800000"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Aadhaar Number (12 digits)</label>
                <input
                  type="text"
                  placeholder="e.g. 123456789012"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  className="input-field"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="btn btn-emerald">
                {loading ? "Generating digital signature..." : "✍️ Sign & Issue Aadhaar Credential"}
              </button>
            </form>
          ) : (
            <div style={{ animation: "scaleIn 0.3s ease-out" }}>
              <div className="status-box success">
                <span className="status-icon">✓</span>
                <div>
                  <strong>Aadhaar Card issued successfully!</strong>
                  {pushedStatus === "success" && (
                    <div style={{ marginTop: 4, color: "var(--accent-emerald-light)", fontWeight: 700 }}>
                      🚀 Pushed credential live to synced wallet via WebSockets!
                    </div>
                  )}
                  {pushedStatus === "sending" && <div>Transmitting to wallet room...</div>}
                </div>
              </div>

              {/* Identity Card Display */}
              <div className="identity-card-container">
                <div className="identity-card">
                  <div className="card-top">
                    <span className="card-logo">🪪</span>
                    <span className="card-gov-title">Government of India</span>
                    <span className="card-logo" style={{ color: "#d97706" }}>🇮🇳</span>
                  </div>
                  <div className="card-body">
                    <div className="card-photo-box">👤</div>
                    <div className="card-info-grid">
                      <div className="card-info-row">
                        <span className="card-info-label">Name</span>
                        <span className="card-info-val">{issuedCredential.subject.name}</span>
                      </div>
                      <div className="card-info-row">
                        <span className="card-info-label">Year of Birth</span>
                        <span className="card-info-val">{issuedCredential.subject.birthYear}</span>
                      </div>
                      <div className="card-info-row">
                        <span className="card-info-label">Income Group</span>
                        <span className="card-info-val">₹{issuedCredential.subject.income.toLocaleString()} / year</span>
                      </div>
                    </div>
                  </div>
                  <div className="card-bottom">
                    <span className="card-signature-seal">
                      🛡️ SEALED BY ECDSA
                    </span>
                    <span className="card-id-num">
                      {getMaskedAadhaar(issuedCredential.subject.aadhaarNumber)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Export Payload */}
              <div className="proof-data">
                <div className="proof-data-header">
                  <span className="proof-data-title">Secure ZK Token Payload</span>
                  <span className="proof-data-badge" style={{ fontSize: "0.6rem", background: "orange", color: "white", padding: "2px 6px", borderRadius: 4 }}>
                    VERIFIABLE
                  </span>
                </div>
                <div className="proof-data-content" style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}>
                  <div><strong>Issuer ID:</strong> did:gov:in:uidai:{issuedCredential.id}</div>
                  <div><strong>ECDSA Signature:</strong> {issuedCredential.signature.substring(0, 48)}...</div>
                  <div><strong>Curve Scheme:</strong> secp256k1 (256-bit ECDSA)</div>
                  <div style={{ marginTop: 4, color: "var(--accent-emerald)" }}>
                    ✓ This digital signature verifies that the inputs are authentic.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "1.5rem" }}>
                <button onClick={handleCopyToClipboard} className="btn btn-primary" style={{ flex: 1 }}>
                  {copied ? "📋 Copied Token!" : "📋 Copy Card Token"}
                </button>
                <button onClick={() => setIssuedCredential(null)} className="btn" style={{ flex: 1, background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-default)" }}>
                  🔄 Issue New Card
                </button>
              </div>
              
              {pushedStatus !== "success" && (
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "center", marginTop: 12 }}>
                  💡 Paste the token into your ZK Wallet app to import it.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
