import { useState, useEffect } from "react";

export default function AdminConsole() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Aadhaar Verification Dept");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [registrationLog, setRegistrationLog] = useState([]);
  
  // Sandbox helper states
  const [devMailLink, setDevMailLink] = useState(null);
  const [devMailCode, setDevMailCode] = useState(null);

  const getBackendUrl = () => {
    return import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
  };

  const handleRegisterEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setDevMailLink(null);
    setDevMailCode(null);

    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/admin/register-employee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, department })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Employee registration rejected.");
      }

      setSuccess(`✓ Employee ${name} pre-registered successfully!`);
      if (data.testPreviewUrl) setDevMailLink(data.testPreviewUrl);
      if (data.demoCode) setDevMailCode(data.demoCode);

      // Add to log list
      setRegistrationLog(prev => [
        { name, email, department, tempId: data.tempId, timestamp: new Date().toISOString() },
        ...prev
      ]);

      // Reset form fields
      setName("");
      setEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out" }}>
      
      {/* Dev Mail Helper panel */}
      {(devMailLink || devMailCode) && (
        <div className="dev-mail-helper" style={{ margin: "0 0 1.5rem 0", position: "relative", zIndex: 10 }}>
          <div className="dev-mail-header">💻 DEVELOPER TEST CONSOLE (ADMIN DISPATCH)</div>
          <div className="dev-mail-body">
            {devMailCode && <div>🔑 Dispatched Temporary Access ID: <strong>{devMailCode}</strong></div>}
            {devMailLink && (
              <div style={{ marginTop: 4 }}>
                📬 Secure Ethereal Inbox: <a href={devMailLink} target="_blank" rel="noopener noreferrer">View Dispatched Mail ↗</a>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="glass-card">
        <div className="card-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
            <div>
              <h2 className="card-title">🏛️ National Identity Registry Console</h2>
              <p className="card-description">Pre-register official department personnel to initialize gateway security authorization pathways.</p>
            </div>
            <span className="ws-indicator connected" style={{ fontSize: "0.8rem", padding: "4px 10px" }}>
              Registry Operations Active
            </span>
          </div>
        </div>

        {success && <div className="auth-success-box" style={{ margin: "1rem 0" }}>{success}</div>}
        {error && <div className="auth-error-box" style={{ margin: "1rem 0" }}>{error}</div>}

        <form onSubmit={handleRegisterEmployee} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            
            <div className="input-group">
              <label className="input-label" style={{ color: "#334155" }}>Employee Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Officer Vinay Kumar"
                className="text-input"
                style={{ background: "#ffffff", border: "1px solid #cbd5e1" }}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" style={{ color: "#334155" }}>Official Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vinay.kumar@zerovault.gov.in"
                className="text-input"
                style={{ background: "#ffffff", border: "1px solid #cbd5e1" }}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" style={{ color: "#334155" }}>Government Division / Role</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="text-input"
                style={{ background: "#ffffff", border: "1px solid #cbd5e1", padding: "8px" }}
              >
                <option value="Aadhaar Verification Dept">Aadhaar Verification Division</option>
                <option value="Biometric Data Center">Biometric Data Center</option>
                <option value="SSI Security Audits">SSI Security Auditing Team</option>
                <option value="Gateway Portal Registry">Gateway Portal Registry Administration</option>
              </select>
            </div>

          </div>

          <button type="submit" className="gov-nav-link active" disabled={loading} style={{ background: "#f97316", color: "#ffffff", padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, width: "fit-content", alignSelf: "flex-end" }}>
            {loading ? "Registering..." : "✍️ Register & Issue Temp ID"}
          </button>
        </form>

        {/* Enrollment Logs */}
        {registrationLog.length > 0 && (
          <div style={{ marginTop: "2rem", borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", color: "#1e3a8a" }}>Logs: Recent Registrations</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {registrationLog.map((log, index) => (
                <div key={index} style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                  <div>
                    <strong>{log.name}</strong> ({log.email}) <br />
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{log.department}</span>
                  </div>
                  <div>
                    <span style={{ fontFamily: "monospace", background: "#e2e8f0", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold" }}>{log.tempId}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
