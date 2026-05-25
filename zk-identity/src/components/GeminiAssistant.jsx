import { useState, useRef, useEffect } from "react";
import { askGemini, isGeminiConfigured } from "../utils/geminiClient";

export default function GeminiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I'm your privacy guide 🔐 Ask me anything about Zero-Knowledge proofs, how this app works, or what keeps your data safe!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const reply = await askGemini(input.trim(), messages);
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, I encountered an error. Try asking again! 🔄",
        },
      ]);
    }

    setLoading(false);
  };

  const quickQuestions = [
    "What is a ZK proof?",
    "How does this keep my data safe?",
    "What can the verifier see?",
  ];

  return (
    <div className="gemini-fab">
      {open && (
        <div className="gemini-chat" style={{ animation: "scaleIn 0.3s ease-out" }}>
          <div className="gemini-chat-header">
            <div className="gemini-chat-header-left">
              <div className="gemini-chat-avatar">🤖</div>
              <div>
                <div className="gemini-chat-title">Privacy Guide</div>
                <div className="gemini-chat-subtitle">
                  {isGeminiConfigured() ? "Powered by Gemini AI" : "Built-in Knowledge"}
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="gemini-chat-close">
              ✕
            </button>
          </div>

          <div className="gemini-chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.text}
              </div>
            ))}

            {loading && (
              <div className="chat-typing">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      setTimeout(() => {
                        setInput(q);
                        send();
                      }, 50);
                    }}
                    style={{
                      padding: "8px 12px",
                      background: "rgba(99, 102, 241, 0.08)",
                      border: "1px solid rgba(99, 102, 241, 0.15)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--accent-primary-light)",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "var(--font-sans)",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "rgba(99, 102, 241, 0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "rgba(99, 102, 241, 0.08)";
                    }}
                  >
                    💬 {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="gemini-chat-input">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about ZK proofs..."
              disabled={loading}
            />
            <button
              onClick={send}
              className="gemini-chat-send"
              disabled={loading || !input.trim()}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      <button onClick={() => setOpen(!open)} className="gemini-fab-btn">
        {open ? "✕" : "🔐"}
        {!open && <div className="pulse-ring"></div>}
      </button>
    </div>
  );
}
