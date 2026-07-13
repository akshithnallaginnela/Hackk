import { useState, useEffect, useRef } from "react";
import { loadModels, captureEnrollment } from "../utils/faceBiometrics";

export default function Settings({ user, onUpdateUser }) {
  const [pin, setPin] = useState("");
  const [altEmail, setAltEmail] = useState(user?.alternativeEmail || "");
  const [altMobile, setAltMobile] = useState(user?.alternativeMobile || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [scanProgress, setScanProgress] = useState(0);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);

  const getBackendUrl = () => {
    return import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("zerovault_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setError("");
    setSuccess("");
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 320, facingMode: "user" } });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
    } catch {
      setError("Failed to access camera.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const handleEnrollFace = async () => {
    if (!videoRef.current) return;
    setLoading(true);
    setError("");
    setSuccess("");
    setScanProgress(0);
    try {
      await loadModels();
      const descriptor = await captureEnrollment(videoRef.current, (p) => setScanProgress(p));
      const response = await fetch(`${getBackendUrl()}/api/auth/wallet/face/enroll`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ faceTemplate: descriptor })
      });
      if (!response.ok) throw new Error("Failed to enroll face.");
      setSuccess("✓ Biometric Face ID enrolled successfully!");
      onUpdateUser({ ...user, hasFaceId: true });
      stopCamera();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecurity = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (pin && pin.length < 4) {
      setError("Security PIN must be at least 4 digits.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/wallet/save-settings`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          pin: pin || undefined,
          alternativeEmail: altEmail,
          alternativeMobile: altMobile
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save security configuration.");
      }

      setSuccess("✓ Security configuration updated successfully!");
      onUpdateUser({
        ...user,
        alternativeEmail: altEmail,
        alternativeMobile: altMobile
      });
      setPin("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card max-w-container" style={{ margin: "2rem auto", animation: "fadeIn 0.5s ease-out" }}>
      <div className="card-header">
        <div className="card-icon-title">
          <div className="card-icon" style={{ background: "rgba(79, 70, 229, 0.08)", color: "var(--accent-primary)" }}>⚙️</div>
          <h2 className="card-title">Security & Credentials Settings</h2>
        </div>
        <p className="card-description">Configure your Self-Sovereign biometric unlocks, custom numeric PINs, and alternative verification nodes.</p>
      </div>

      {success && <div className="auth-success-box" style={{ margin: "1rem 0" }}>{success}</div>}
      {error && <div className="auth-error-box" style={{ margin: "1rem 0" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem", marginTop: "1rem" }}>
        
        {/* Face ID Section */}
        <div style={{ padding: "1.5rem", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.06)", background: "rgba(255,255,255,0.4)" }}>
          <h3 style={{ margin: "0 0 0.5rem 0", display: "flex", alignItems: "center", gap: 8, fontSize: "1.1rem" }}>
            👤 Biometric Face ID Enrollment
          </h3>
          <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Register your face to unlock your ZeroVault instantly using your camera. Your biometric template remains secured client-side.
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            {showCamera && (
              <div className="auth-face-camera-container" style={{ width: "240px", height: "240px" }}>
                <video ref={videoRef} autoPlay playsInline muted className="auth-face-camera-video" style={{ objectFit: "cover" }} />
                <div className="auth-face-scanline" />
                <div className="auth-face-corner tl" />
                <div className="auth-face-corner tr" />
                <div className="auth-face-corner bl" />
                <div className="auth-face-corner br" />
              </div>
            )}

            {scanProgress > 0 && (
              <div className="auth-progress-bar" style={{ width: '80%', height: '4px', background: 'rgba(150,150,150,0.2)', borderRadius: '2px' }}>
                <div style={{ width: `${scanProgress}%`, background: 'var(--accent-primary)', height: '100%', transition: 'width 0.3s ease' }} />
              </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem" }}>
              {!showCamera && (
                <button type="button" className="auth-btn auth-btn-primary" onClick={startCamera} style={{ background: "var(--accent-primary)" }}>
                  📸 Enlist Face Camera
                </button>
              )}
              {showCamera && (
                <>
                  <button type="button" className="auth-btn auth-btn-primary" onClick={handleEnrollFace} disabled={loading} style={{ background: "var(--accent-emerald)" }}>
                    {loading ? "Capturing..." : "Start Enrollment"}
                  </button>
                  <button type="button" className="auth-btn auth-btn-ghost" onClick={stopCamera}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <span className={`badge ${user?.hasFaceId ? "valid" : "invalid"}`} style={{ fontSize: "0.8rem", padding: "4px 10px" }}>
              {user?.hasFaceId ? "✓ Face ID Active" : "✗ Face ID Not Configured"}
            </span>
          </div>
        </div>

        {/* Security Settings Form */}
        <form onSubmit={handleSaveSecurity} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            
            <div className="input-group">
              <label className="input-label">Update Security PIN Code</label>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter new PIN (4-6 digits)"
                className="text-input"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Alternative Email address</label>
              <input
                type="email"
                value={altEmail}
                onChange={(e) => setAltEmail(e.target.value)}
                placeholder="alternative@example.com"
                className="text-input"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Alternative Mobile Number</label>
              <input
                type="tel"
                value={altMobile}
                onChange={(e) => setAltMobile(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="text-input"
              />
            </div>

          </div>

          <button type="submit" className="auth-btn auth-btn-primary" disabled={loading} style={{ background: "var(--accent-primary)", marginTop: "0.5rem", width: "100%", maxWidth: "200px", alignSelf: "flex-end" }}>
            {loading ? "Saving..." : "💾 Update Security"}
          </button>
        </form>
      </div>
    </div>
  );
}
