import { useState, useEffect } from "react";
import ClaimSelector from "./ClaimSelector";
import { generateAgeProof, generateIncomeProof, generateAadhaarProof } from "../utils/zkProver";

export default function ProverPortal({ onProofGenerated }) {
  const [selectedClaim, setSelectedClaim] = useState("age_gte_18");
  const [status, setStatus] = useState("idle"); // idle | proving | done | error
  const [proof, setProof] = useState(null);
  const [provingStep, setProvingStep] = useState("");

  // Input states
  const [birthYear, setBirthYear] = useState("");
  const [income, setIncome] = useState("");
  const [lowerBound, setLowerBound] = useState("300000");
  const [upperBound, setUpperBound] = useState("1000000");
  const [aadhaarNumber, setAadhaarNumber] = useState("");

  const handleProve = async () => {
    setStatus("proving");
    setProof(null);

    try {
      let result;

      switch (selectedClaim) {
        case "age_gte_18":
          if (!birthYear || birthYear < 1900 || birthYear > new Date().getFullYear()) {
            throw new Error("Invalid birth year");
          }
          setProvingStep("Computing witness from private inputs...");
          await delay(400);
          setProvingStep("Generating Groth16 proof (π_a, π_b, π_c)...");
          await delay(300);
          result = await generateAgeProof(parseInt(birthYear));
          setProvingStep("Extracting public signals...");
          await delay(200);
          break;

        case "income_range":
          if (!income || parseInt(income) < 0) {
            throw new Error("Invalid income");
          }
          setProvingStep("Encoding private income into field elements...");
          await delay(400);
          setProvingStep("Computing range proof constraints...");
          await delay(300);
          result = await generateIncomeProof(
            parseInt(income),
            parseInt(lowerBound),
            parseInt(upperBound)
          );
          setProvingStep("Finalizing proof...");
          await delay(200);
          break;

        case "aadhaar_valid":
          if (!aadhaarNumber || aadhaarNumber.length !== 12) {
            throw new Error("Aadhaar must be 12 digits");
          }
          setProvingStep("Hashing Aadhaar with Poseidon...");
          await delay(400);
          setProvingStep("Generating validity proof...");
          await delay(300);
          result = await generateAadhaarProof(aadhaarNumber);
          setProvingStep("Creating commitment hash...");
          await delay(200);
          break;
      }

      setProof(result);
      setStatus("done");
      onProofGenerated(result);

      // Save to proof history
      const history = JSON.parse(localStorage.getItem("proofHistory") || "[]");
      history.unshift({
        claim: result.claim,
        isValid: result.isValid !== undefined ? result.isValid : result.publicSignals?.[0] === "1",
        timestamp: new Date().toISOString(),
        mode: result.mode,
      });
      localStorage.setItem("proofHistory", JSON.stringify(history.slice(0, 20)));
    } catch (err) {
      console.error("Proof generation error:", err);
      setStatus("error");
      setProvingStep(err.message || "Proof generation failed");
    }
  };

  const renderInputs = () => {
    switch (selectedClaim) {
      case "age_gte_18":
        return (
          <div className="input-group">
            <label className="input-label">
              Birth Year
              <span className="private-badge">🔒 PRIVATE</span>
            </label>
            <input
              type="number"
              placeholder="e.g. 1998"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className="input-field"
              min="1900"
              max={new Date().getFullYear()}
            />
          </div>
        );

      case "income_range":
        return (
          <>
            <div className="input-group">
              <label className="input-label">
                Annual Income (₹)
                <span className="private-badge">🔒 PRIVATE</span>
              </label>
              <input
                type="number"
                placeholder="e.g. 500000"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="input-row">
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
          </>
        );

      case "aadhaar_valid":
        return (
          <div className="input-group">
            <label className="input-label">
              Aadhaar Number
              <span className="private-badge">🔒 PRIVATE</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 123456789012"
              value={aadhaarNumber}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 12);
                setAadhaarNumber(v);
              }}
              className="input-field"
              maxLength={12}
            />
          </div>
        );
    }
  };

  const getButtonLabel = () => {
    if (status === "proving") return null; // Show animation instead
    switch (selectedClaim) {
      case "age_gte_18": return "Generate Age Proof";
      case "income_range": return "Generate Income Proof";
      case "aadhaar_valid": return "Generate Aadhaar Proof";
      default: return "Generate Proof";
    }
  };

  const isInputValid = () => {
    switch (selectedClaim) {
      case "age_gte_18": return birthYear && birthYear >= 1900 && birthYear <= new Date().getFullYear();
      case "income_range": return income && parseInt(income) >= 0;
      case "aadhaar_valid": return aadhaarNumber && aadhaarNumber.length === 12;
      default: return false;
    }
  };

  return (
    <div className="glass-card max-w-container">
      <div className="card-header">
        <div className="card-icon-title">
          <div className="card-icon prover">🔏</div>
          <h2 className="card-title">Prove Your Identity</h2>
        </div>
        <p className="card-description">
          Your private data never leaves your device. Only the mathematical proof is shared.
        </p>
      </div>

      <ClaimSelector selectedClaim={selectedClaim} onSelect={setSelectedClaim} />

      {renderInputs()}

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
        <button
          onClick={handleProve}
          disabled={!isInputValid()}
          className="btn btn-primary"
        >
          ⚡ {getButtonLabel()}
        </button>
      )}

      {status === "done" && proof && (
        <>
          <div className="status-box success">
            <span className="status-icon">✅</span>
            <div>
              <strong>Proof generated successfully!</strong>
              <div style={{ marginTop: 4, opacity: 0.8 }}>
                {selectedClaim === "age_gte_18" && "Age ≥ 18 confirmed without revealing your birth year."}
                {selectedClaim === "income_range" && "Income range confirmed without revealing exact amount."}
                {selectedClaim === "aadhaar_valid" && "Aadhaar validity confirmed without revealing the number."}
              </div>
            </div>
          </div>

          <div className="proof-data">
            <div className="proof-data-header">
              <span className="proof-data-title">Proof Object (π)</span>
              <span className={`proof-data-badge ${proof.mode}`}>
                {proof.mode === "real" ? "🔗 REAL ZK" : "🧪 DEMO"}
              </span>
            </div>
            <div className="proof-data-content">
              <div><strong style={{ color: "var(--accent-primary-light)" }}>π_a:</strong> [{proof.proof.pi_a[0].substring(0, 24)}..., {proof.proof.pi_a[1].substring(0, 24)}...]</div>
              <div><strong style={{ color: "var(--accent-violet)" }}>π_b:</strong> [[{proof.proof.pi_b[0][0].substring(0, 20)}...], [{proof.proof.pi_b[1][0].substring(0, 20)}...]]</div>
              <div><strong style={{ color: "var(--accent-cyan)" }}>π_c:</strong> [{proof.proof.pi_c[0].substring(0, 24)}..., {proof.proof.pi_c[1].substring(0, 24)}...]</div>
              <div style={{ marginTop: 8, color: "var(--accent-emerald)" }}>
                <strong>Public Signals:</strong> [{proof.publicSignals.join(", ")}]
              </div>
              <div style={{ marginTop: 4, color: "var(--accent-amber)", fontSize: "0.7rem" }}>
                ⚠️ Notice: Birth year / income / Aadhaar is NOT in the proof output
              </div>
            </div>
          </div>

          <div className="privacy-shield">
            <span className="privacy-shield-icon">🛡️</span>
            <span className="privacy-shield-text">
              Zero private data transmitted — cryptographically guaranteed
            </span>
          </div>
        </>
      )}

      {status === "error" && (
        <div className="status-box error">
          <span className="status-icon">❌</span>
          <div>
            <strong>Proof generation failed</strong>
            <div style={{ marginTop: 4, opacity: 0.8 }}>{provingStep}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
