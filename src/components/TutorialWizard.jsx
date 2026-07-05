import { useState } from "react";

export default function TutorialWizard({ onComplete, onSkipToLogin }) {
  const [slide, setSlide] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [otpPin, setOtpPin] = useState("");
  const [devMailLink, setDevMailLink] = useState(null);
  const [devMailCode, setDevMailCode] = useState(null);

  const getBackendUrl = () => {
    return import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !mobile) {
      setError("Please complete all registration fields.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/wallet/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, mobile })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize wallet profile.");
      }

      setEmailSent(true);
      if (data.testPreviewUrl) setDevMailLink(data.testPreviewUrl);
      if (data.demoCode) setDevMailCode(data.demoCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOnboardPin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/wallet/login-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin: otpPin })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Onboarding verification PIN mismatch.");
      }

      // Completed onboarding
      localStorage.setItem("zerovault_user_email", data.user.email);
      onComplete(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => setSlide(s => s + 1);
  const prevSlide = () => setSlide(s => s - 1);

  return (
    <div className="auth-screen" style={{ background: "linear-gradient(135deg, #09090e 0%, #111124 50%, #070710 100%)", minHeight: "100vh", color: "#f8fafc", display: "flex", justifyContent: "center", alignItems: "center", padding: "1.5rem" }}>
      
      <div className="auth-orb" style={{ background: "rgba(79, 70, 229, 0.08)", width: "300px", height: "300px", top: "10%", left: "10%" }} />
      <div className="auth-orb" style={{ background: "rgba(124, 58, 237, 0.06)", width: "400px", height: "400px", bottom: "10%", right: "10%" }} />

      <div className="auth-card" style={{ maxWidth: "560px", background: "rgba(17, 17, 27, 0.65)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
        
        {/* Helper Test Console */}
        {(devMailLink || devMailCode) && (
          <div className="dev-mail-helper" style={{ marginBottom: "1rem", position: "relative", zIndex: 10 }}>
            <div className="dev-mail-header">💻 DEVELOPER TEST CONSOLE</div>
            <div className="dev-mail-body">
              {devMailCode && <div>🔑 Vault Security PIN: <strong>{devMailCode}</strong></div>}
              {devMailLink && (
                <div style={{ marginTop: 4 }}>
                  📬 Secure Ethereal Inbox: <a href={devMailLink} target="_blank" rel="noopener noreferrer">View Dispatched Mail ↗</a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "1.5rem" }}>
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} style={{ flex: 1, height: "4px", borderRadius: "2px", background: idx <= slide ? "var(--accent-primary)" : "rgba(255,255,255,0.1)", transition: "background 0.3s ease" }} />
          ))}
        </div>

        {/* Slide 0: Welcome */}
        {slide === 0 && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "3rem" }}>🔐</span>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "1rem 0 0.5rem", background: "linear-gradient(135deg, #a5b4fc, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Welcome to ZeroVault</h2>
              <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>A next-generation privacy-preserving Self-Sovereign Identity (SSI) Lockbox.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", margin: "2rem 0" }}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.5rem" }}>🛡️</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: "1rem", color: "#e2e8f0" }}>Absolute Privacy By Design</h4>
                  <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>Your private credentials, birth records, and Aadhaar numbers remain securely locked on your device. We never store them on central databases.</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.5rem" }}>⚡</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: "1rem", color: "#e2e8f0" }}>Zero-Knowledge Math</h4>
                  <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>Verify attributes (like "Age &gt;= 18") with stores and portals using mathematical proofs, without showing your actual birth certificate.</p>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2rem" }}>
              {onSkipToLogin && (
                <button type="button" className="auth-btn auth-btn-ghost" onClick={onSkipToLogin} style={{ fontSize: "0.85rem" }}>
                  Already registered? Log in →
                </button>
              )}
              <button type="button" className="auth-btn auth-btn-primary" onClick={nextSlide} style={{ background: "var(--accent-primary)" }}>
                Start Tour →
              </button>
            </div>
          </div>
        )}

        {/* Slide 1: ZKP Analogy */}
        {slide === 1 && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 1rem", color: "#e2e8f0" }}>🧠 What is a Zero-Knowledge Proof?</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.5 }}>
              Imagine a lockable room inside a cave. You want to prove to a friend you know the secret code to open the door, but you don't want to tell them the code.
            </p>
            
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "1rem", margin: "1.25rem 0", fontSize: "0.85rem" }}>
              <div style={{ color: "var(--accent-emerald)", fontWeight: 600, marginBottom: "0.25rem" }}>🔑 How it works in ZeroVault:</div>
              You enter your birth year offline. Our app compiles a ZK cryptographic proof (π_a, π_b, π_c). 
              The store verifies the proof package. They get a <strong>YES</strong> or <strong>NO</strong>. Your birth year is mathematically hidden.
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem" }}>
              <button type="button" className="auth-btn auth-btn-ghost" onClick={prevSlide}>Back</button>
              <button type="button" className="auth-btn auth-btn-primary" onClick={nextSlide} style={{ background: "var(--accent-primary)" }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Slide 2: Real-time SSI Sync */}
        {slide === 2 && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 1rem", color: "#e2e8f0" }}>📡 Real-time Verification Sync</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.5 }}>
              ZeroVault integrates with government issuance authorities and retail terminals in real-time over secure WebSockets.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "1.25rem 0" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "8px 12px", borderRadius: "6px" }}>
                <span style={{ fontSize: "1.25rem" }}>🏛️</span>
                <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>Gov portal issues signed identity cards to your wallet.</span>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "8px 12px", borderRadius: "6px" }}>
                <span style={{ fontSize: "1.25rem" }}>💼</span>
                <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>You compile offline proofs of age, range, or ID signature.</span>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "8px 12px", borderRadius: "6px" }}>
                <span style={{ fontSize: "1.25rem" }}>🍻</span>
                <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>Verifiers verify the proof details automatically over sync lanes.</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem" }}>
              <button type="button" className="auth-btn auth-btn-ghost" onClick={prevSlide}>Back</button>
              <button type="button" className="auth-btn auth-btn-primary" onClick={nextSlide} style={{ background: "var(--accent-primary)" }}>
                Next: Onboard →
              </button>
            </div>
          </div>
        )}

        {/* Slide 3: Onboarding Profile Generation */}
        {slide === 3 && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 0.5rem", color: "#e2e8f0" }}>✍️ Create Security Profile</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "0 0 1.25rem 0" }}>
              Provide details to initialize your cryptographic lockbox. An unlock PIN will be securely generated and sent to your email.
            </p>

            {error && <div className="auth-error-box" style={{ marginBottom: "1rem" }}>{error}</div>}

            {!emailSent ? (
              <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div className="auth-input-group">
                  <label className="auth-input-label">Full Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="auth-text-input" placeholder="Enter full name" required />
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="auth-text-input" placeholder="you@example.com" required />
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Mobile Number</label>
                  <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} className="auth-text-input" placeholder="+91 XXXXX XXXXX" required />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
                  <button type="button" className="auth-btn auth-btn-ghost" onClick={prevSlide}>Back</button>
                  <button type="submit" className="auth-btn auth-btn-primary" disabled={loading} style={{ background: "var(--accent-primary)" }}>
                    {loading ? "Generating PIN..." : "Register & Get Unlock PIN"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOnboardPin} style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
                <div className="auth-email-sent">
                  <div className="auth-email-sent-icon">📬</div>
                  <p style={{ color: "#a5b4fc", margin: "5px 0 0 0", fontSize: "0.85rem" }}>PIN dispatched to <strong>{email}</strong></p>
                </div>
                
                <div className="auth-input-group" style={{ width: "100%", maxWidth: "300px", textAlign: "center" }}>
                  <label className="auth-input-label" style={{ textAlign: "center" }}>Enter Security PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={otpPin}
                    onChange={(e) => setOtpPin(e.target.value.replace(/\D/g, ""))}
                    className="auth-code-input auth-pin-input"
                    placeholder="• • • •"
                    style={{ "--accent": "#4f46e5", letterSpacing: "12px", width: "100%", fontSize: "1.5rem", padding: "10px" }}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: "flex", gap: "0.5rem", width: "100%", marginTop: "1rem" }}>
                  <button type="button" className="auth-btn auth-btn-ghost" style={{ flex: 1 }} onClick={() => setEmailSent(false)}>Back</button>
                  <button type="submit" className="auth-btn auth-btn-primary" disabled={loading} style={{ background: "var(--accent-primary)", flex: 2 }}>
                    {loading ? "Verifying..." : "Unlock ZeroVault"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
