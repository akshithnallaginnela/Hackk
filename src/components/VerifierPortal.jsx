import { useState } from "react";
import { verifyProof } from "../utils/zkVerifier";
import { detectFraudPattern } from "../utils/geminiClient";

export default function VerifierPortal({ incomingProof }) {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [fraudCheck, setFraudCheck] = useState(null);

  const handleVerify = async () => {
    if (!incomingProof) return;
    setVerifying(true);
    setResult(null);
    setFraudCheck(null);

    try {
      // Verify the proof
      const verificationResult = await verifyProof(incomingProof);
      setResult(verificationResult);

      // Run fraud detection in parallel
      const history = JSON.parse(localStorage.getItem("proofHistory") || "[]");
      if (history.length >= 2) {
        const fraud = await detectFraudPattern(history);
        setFraudCheck(fraud);
      }
    } catch (err) {
      console.error("Verification error:", err);
      setResult({ valid: false, error: err.message });
    }

    setVerifying(false);
  };

  const getClaimLabel = () => {
    if (!incomingProof) return "No proof received";
    switch (incomingProof.claim) {
      case "age_gte_18": return "Age ≥ 18 Verification";
      case "income_range": return "Income Range Verification";
      case "aadhaar_valid": return "Aadhaar Validity Check";
      default: return "Identity Claim";
    }
  };

  return (
    <div className="glass-card max-w-container">
      <div className="card-header">
        <div className="card-icon-title">
          <div className="card-icon verifier">✅</div>
          <h2 className="card-title">Verify a Claim</h2>
        </div>
        <p className="card-description">
          Confirm the proof is valid. You will <strong>NEVER</strong> see the user's raw data.
        </p>
      </div>

      {/* Incoming proof status */}
      {incomingProof ? (
        <div className="status-box info">
          <span className="status-icon">📨</span>
          <div>
            <strong>Proof received: {getClaimLabel()}</strong>
            <div style={{ marginTop: 4, opacity: 0.8 }}>
              Protocol: Groth16 | Curve: BN128 | Mode: {incomingProof.mode}
            </div>
          </div>
        </div>
      ) : (
        <div className="status-box" style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--border-default)",
          color: "var(--text-muted)"
        }}>
          <span className="status-icon">⏳</span>
          <div>
            <strong>Waiting for proof...</strong>
            <div style={{ marginTop: 4, opacity: 0.8 }}>
              Switch to the Prover tab to generate a proof first.
            </div>
          </div>
        </div>
      )}

      {/* Verify button */}
      <button
        onClick={handleVerify}
        disabled={!incomingProof || verifying}
        className="btn btn-emerald"
        style={{ marginTop: "1.25rem" }}
      >
        {verifying ? (
          <>
            <div className="spinner"></div>
            Verifying Proof...
          </>
        ) : (
          <>🔍 Verify Proof</>
        )}
      </button>

      {/* Verification result */}
      {result && (
        <div className={`verify-result ${result.valid ? "valid" : "invalid"}`}>
          <div className="verify-result-icon">
            {result.valid ? "✅" : "❌"}
          </div>
          <div className="verify-result-title">
            {result.valid ? "VALID — Claim Confirmed" : "INVALID — Verification Failed"}
          </div>
          <div className="verify-result-subtitle">
            {result.valid
              ? "The proof is mathematically valid. The claim is true."
              : "The proof failed verification. The claim could not be confirmed."}
          </div>

          {result.details && (
            <div className="verify-details">
              {Object.entries(result.details).map(([key, value]) => (
                <div className="verify-detail-row" key={key}>
                  <span className="verify-detail-label">
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                  </span>
                  <span className="verify-detail-value">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fraud alert */}
      {fraudCheck && fraudCheck.suspicious && (
        <div className="status-box warning" style={{ marginTop: "1rem" }}>
          <span className="status-icon">⚠️</span>
          <div>
            <strong>AI Fraud Signal Detected</strong>
            <div style={{ marginTop: 4, opacity: 0.8 }}>
              {fraudCheck.reason}
            </div>
            {fraudCheck.riskLevel && (
              <div style={{ marginTop: 4 }}>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  background: fraudCheck.riskLevel === "high"
                    ? "rgba(239, 68, 68, 0.2)"
                    : "rgba(245, 158, 11, 0.2)",
                  color: fraudCheck.riskLevel === "high" ? "#fca5a5" : "#fcd34d",
                }}>
                  Risk: {fraudCheck.riskLevel.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* What verifier can see */}
      {result && result.valid && (
        <div className="privacy-shield" style={{ marginTop: "1rem" }}>
          <span className="privacy-shield-icon">👁️</span>
          <span className="privacy-shield-text">
            Verifier sees only: YES/NO result + public parameters. Raw data was never transmitted.
          </span>
        </div>
      )}
    </div>
  );
}
