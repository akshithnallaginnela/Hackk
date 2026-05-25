import { useState } from "react";

export default function IssuerPortal() {
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [income, setIncome] = useState("");
  
  const [issuedCredential, setIssuedCredential] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedStatus, setSavedStatus] = useState(false);

  const handleIssue = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSavedStatus(false);

    if (aadhaarNumber.length !== 12) {
      setError("Aadhaar must be exactly 12 digits");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/api/issue", {
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
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong during issuance");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToWallet = () => {
    if (!issuedCredential) return;
    
    // Save to localStorage so ProverWallet can access it
    const credentials = JSON.parse(localStorage.getItem("myCredentials") || "[]");
    
    // Remove existing card of the same type if exists to prevent duplicates
    const filtered = credentials.filter(c => c.subject.aadhaarNumber !== issuedCredential.subject.aadhaarNumber);
    filtered.unshift(issuedCredential);
    
    localStorage.setItem("myCredentials", JSON.stringify(filtered));
    setSavedStatus(true);
  };

  const getMaskedAadhaar = (num) => {
    if (!num) return "";
    return `XXXX XXXX ${num.slice(-4)}`;
  };

  return (
    <div className="glass-card max-w-container" style={{ margin: "2rem auto" }}>
      <div className="card-header">
        <div className="card-icon-title">
          <div className="card-icon verifier">🏛️</div>
          <h2 className="card-title">Digital Identity Issuer Portal</h2>
        </div>
        <p className="card-description">
          Representing a Government Identity Authority (Mock UIDAI). Verify details and cryptographically sign them to issue a secure ZK-Ready Verifiable Credential.
        </p>
      </div>

      {!issuedCredential ? (
        <form onSubmit={handleIssue} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
            {loading ? "Signing Credential..." : "✍️ Sign & Issue ZK Credential"}
          </button>
        </form>
      ) : (
        <div style={{ animation: "scaleIn 0.3s ease-out" }}>
          <div className="status-box success">
            <span className="status-icon">✓</span>
            <div>
              <strong>Credential Signed with ECDSA Key!</strong>
              <div style={{ marginTop: 4, opacity: 0.8 }}>
                The data has been sealed with a mock government signature.
              </div>
            </div>
          </div>

          {/* Premium Virtual Aadhaar Card */}
          <div className="identity-card-container">
            <div className="identity-card">
              <div className="card-top">
                <span className="card-logo">🪪</span>
                <span className="card-gov-title">Government of India (Demo)</span>
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
                    <span className="card-info-label">Income Status</span>
                    <span className="card-info-val">₹{issuedCredential.subject.income.toLocaleString()} / year</span>
                  </div>
                </div>
              </div>
              <div className="card-bottom">
                <span className="card-signature-seal">
                  🛡️ SIGNED (ECDSA)
                </span>
                <span className="card-id-num masked">
                  {getMaskedAadhaar(issuedCredential.subject.aadhaarNumber)}
                </span>
              </div>
            </div>
          </div>

          {/* Cryptographic Proof Details */}
          <div className="proof-data">
            <div className="proof-data-header">
              <span className="proof-data-title">Verifiable Signature Payload</span>
              <span className="proof-data-badge simulation" style={{ background: "rgba(5, 150, 105, 0.1)", color: "var(--accent-emerald)" }}>
                SEALED
              </span>
            </div>
            <div className="proof-data-content" style={{ fontSize: "0.7rem" }}>
              <div><strong>Signature (r,s):</strong> {issuedCredential.signature.substring(0, 64)}...</div>
              <div><strong>Hash Standard:</strong> SHA256withECDSA (secp256k1)</div>
              <div><strong>Issuer DID:</strong> did:gov:in:uidai:{issuedCredential.id}</div>
              <div style={{ marginTop: 4, color: "var(--accent-primary)" }}>
                ✅ Ready to be verified locally inside your private ZK-proof client.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "1.5rem" }}>
            <button onClick={handleSaveToWallet} disabled={savedStatus} className="btn btn-primary" style={{ flex: 1 }}>
              {savedStatus ? "💾 Saved to Wallet!" : "💾 Save to Wallet"}
            </button>
            <button onClick={() => setIssuedCredential(null)} className="btn" style={{ flex: 1, background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-default)" }}>
              🔄 Issue Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
