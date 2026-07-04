import { useState, useEffect } from "react";

export default function GovDashboard({ wsStatus, onNavigate }) {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    activeSync: false,
    avgTime: "1.4s"
  });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    // Load issuance history
    const stored = JSON.parse(localStorage.getItem("govIssuanceHistory") || "[]");
    setHistory(stored);

    // Calculate stats
    const total = stored.length;
    
    // Today's count
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const today = stored.filter(item => new Date(item.timestamp) >= startOfToday).length;

    setStats({
      total,
      today,
      activeSync: wsStatus === "connected",
      avgTime: total > 0 ? "1.2s" : "—"
    });

    // Generate chart data for last 7 days
    const days = [];
    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0,0,0,0);
      
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const count = stored.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= d && itemDate < nextD;
      }).length;

      days.push({
        label: weekdayNames[d.getDay()],
        count
      });
    }
    setChartData(days);
  }, [wsStatus]);

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear the issuance history log?")) {
      localStorage.removeItem("govIssuanceHistory");
      setHistory([]);
      setStats({
        total: 0,
        today: 0,
        activeSync: wsStatus === "connected",
        avgTime: "—"
      });
      setChartData(chartData.map(d => ({ ...d, count: 0 })));
    }
  };

  const getMaskedAadhaar = (num) => {
    if (!num) return "";
    return `XXXX XXXX ${num.slice(-4)}`;
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  return (
    <div className="gov-dashboard" style={{ animation: "fadeIn 0.4s ease-out" }}>
      {/* Overview Stats Cards */}
      <div className="gov-stats-grid">
        <div className="gov-stat-card">
          <div className="gov-stat-icon tricolor-saffron">✍️</div>
          <div className="gov-stat-info">
            <span className="gov-stat-value">{stats.total}</span>
            <span className="gov-stat-label">Total Issued</span>
          </div>
        </div>

        <div className="gov-stat-card">
          <div className="gov-stat-icon tricolor-white">🇮🇳</div>
          <div className="gov-stat-info">
            <span className="gov-stat-value">{stats.today}</span>
            <span className="gov-stat-label">Issued Today</span>
          </div>
        </div>

        <div className="gov-stat-card">
          <div className="gov-stat-icon tricolor-emerald">⚡</div>
          <div className="gov-stat-info">
            <span className={`gov-stat-value ${stats.activeSync ? "active" : ""}`}>
              {stats.activeSync ? "Synced" : "Offline"}
            </span>
            <span className="gov-stat-label">Wallet Sync</span>
          </div>
        </div>

        <div className="gov-stat-card">
          <div className="gov-stat-icon tricolor-blue">⏱️</div>
          <div className="gov-stat-info">
            <span className="gov-stat-value">{stats.avgTime}</span>
            <span className="gov-stat-label">Signing Speed</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & History */}
      <div className="gov-dash-grid">
        
        {/* Analytics Chart */}
        <div className="gov-dash-card chart-card">
          <h3 className="gov-card-title">Credential Analytics (Last 7 Days)</h3>
          <div className="chart-container">
            <div className="chart-bars">
              {chartData.map((d, i) => {
                const heightPercent = (d.count / maxCount) * 100;
                return (
                  <div key={i} className="chart-bar-column">
                    <div className="chart-bar-value">{d.count}</div>
                    <div className="chart-bar-wrapper">
                      <div 
                        className="chart-bar-fill" 
                        style={{ height: `${Math.max(heightPercent, 5)}%`, animationDelay: `${i * 50}ms` }}
                      />
                    </div>
                    <div className="chart-bar-label">{d.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Launch Panel */}
        <div className="gov-dash-card flex-row-card">
          <div className="launch-text-side">
            <h3 className="gov-card-title" style={{ marginBottom: 4 }}>UIDAI Issuance Terminal</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Access the secure portal to sign and issue new credentials to client wallets.
            </p>
            <button 
              className="btn btn-emerald" 
              onClick={() => onNavigate("terminal")}
              style={{ width: "auto", padding: "12px 24px" }}
            >
              ✍️ Launch Issuance Terminal
            </button>
          </div>
          <div className="launch-icon-side">🏛️</div>
        </div>

        {/* Recent activity list */}
        <div className="gov-dash-card history-card" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 className="gov-card-title">Recent Issuance History</h3>
            {history.length > 0 && (
              <button className="clear-log-btn" onClick={clearHistory}>
                Clear Logs
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="empty-history">
              <span style={{ fontSize: "2rem" }}>📭</span>
              <p>No credentials issued yet. Launch the terminal to begin.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Full Name</th>
                    <th>Aadhaar Number</th>
                    <th>YOB</th>
                    <th>Income</th>
                    <th>Sync Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 8).map((item, idx) => (
                    <tr key={idx} style={{ animationDelay: `${idx * 40}ms`, animation: "slideUp 0.3s ease-out backwards" }}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                        <span className="table-sub-text">
                          {formatTime(item.timestamp)}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "var(--text-primary)" }}>{item.name}</strong>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                        {getMaskedAadhaar(item.aadhaarNumber)}
                      </td>
                      <td>{item.birthYear}</td>
                      <td style={{ fontWeight: 600 }}>
                        ₹{item.income.toLocaleString()}
                      </td>
                      <td>
                        {item.pushed ? (
                          <span className="delivery-badge success">✓ WebSocket Live</span>
                        ) : (
                          <span className="delivery-badge manual">📋 Copy-Paste</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
