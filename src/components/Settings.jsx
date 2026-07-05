import { useState, useEffect, useRef } from "react";

export default function Settings({ user, onUpdateUser }) {
  const [pin, setPin] = useState("");
  const [altEmail, setAltEmail] = useState(user?.alternativeEmail || "");
  const [altMobile, setAltMobile] = useState(user?.alternativeMobile || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Biometrics webcam state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const videoRef = useRef(null);

  const getBackendUrl = () => {
    return import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setError("");
    setSuccess("");
    setCapturedPhoto(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320, facingMode: "user" }
      });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err) {
      console.error(err);
      setError("Failed to access camera. Please check permissions.");
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

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, 320, 320);
    const dataUrl = canvas.toDataURL("image/jpeg");
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleEnrollFace = async () => {
    if (!capturedPhoto) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/wallet/save-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          faceIdPhoto: capturedPhoto
        })
      });

      if (!response.ok) {
        throw new Error("Failed to enroll face profile.");
      }

      setSuccess("✓ Biometric Face ID enrolled successfully!");
      onUpdateUser({ ...user, hasFaceId: true });
      setCapturedPhoto(null);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
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

            {capturedPhoto && !showCamera && (
              <div style={{ position: "relative", width: "160px", height: "160px", borderRadius: "50%", overflow: "hidden", border: "3px solid var(--accent-primary)" }}>
                <img src={capturedPhoto} alt="Captured" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem" }}>
              {!showCamera && !capturedPhoto && (
                <button type="button" className="auth-btn auth-btn-primary" onClick={startCamera} style={{ background: "var(--accent-primary)" }}>
                  📸 Enlist Face Camera
                </button>
              )}
              {showCamera && (
                <>
                  <button type="button" className="auth-btn auth-btn-primary" onClick={capturePhoto} style={{ background: "var(--accent-emerald)" }}>
                    Capture Reference Image
                  </button>
                  <button type="button" className="auth-btn auth-btn-ghost" onClick={stopCamera}>
                    Cancel
                  </button>
                </>
              )}
              {capturedPhoto && (
                <>
                  <button type="button" className="auth-btn auth-btn-primary" onClick={handleEnrollFace} disabled={loading} style={{ background: "var(--accent-primary)" }}>
                    {loading ? "Enrolling..." : "💾 Save Enrolled Biometrics"}
                  </button>
                  <button type="button" className="auth-btn auth-btn-ghost" onClick={() => setCapturedPhoto(null)}>
                    Retake
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
