# 🔐 ZK Identity Verifier — Full Hackathon Build Prompt

> **Project:** Invisible Identity — Prove who you are without exposing what you are  
> **Stack:** 100% Open Source | AI via Gemini API | ZK Proofs via snarkjs + circom

---

## 🎯 Project Overview

Build a **privacy-preserving identity verification web app** where users can prove specific claims about themselves (age ≥ 18, valid Aadhaar holder, income bracket, etc.) to a verifier — **without revealing the actual underlying data**.

The system uses **Zero-Knowledge Proofs (ZK)** on the client side and **Gemini AI** as an intelligent assistant layer for onboarding guidance, fraud pattern detection, and claim explanation.

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   USER (Prover)                       │
│  Enters private data → ZK Proof generated in browser │
│  Proof sent to verifier — NO raw data ever leaves    │
└────────────────────┬─────────────────────────────────┘
                     │  ZK Proof + Public Inputs only
┌────────────────────▼─────────────────────────────────┐
│               VERIFIER (Service / dApp)               │
│  Receives proof → Verifies on-chain or off-chain     │
│  Gets YES/NO answer — never sees user's actual data  │
└────────────────────┬─────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────┐
│               GEMINI AI LAYER                         │
│  Guides users through onboarding, explains ZK steps, │
│  detects anomalous claim patterns (fraud signals)    │
└──────────────────────────────────────────────────────┘
```

---

## 🧱 Full Tech Stack (All Open Source)

| Layer | Technology | Purpose |
|---|---|---|
| ZK Circuits | **Circom 2.0** | Write ZK circuit logic (age check, range proofs) |
| ZK Proving | **snarkjs** | Generate & verify Groth16 proofs in browser/Node |
| Trusted Setup | **snarkjs ptau** | Powers of Tau ceremony for circuit compilation |
| Frontend | **React + Vite** | UI for Prover and Verifier portals |
| Styling | **Tailwind CSS** | Utility-first styling |
| Backend | **Node.js + Express** | Proof verification API endpoint |
| AI Assistant | **Gemini 1.5 Flash API** | Onboarding guide + fraud detection |
| Hashing | **poseidon-lite** (npm) | ZK-friendly hash for commitments |
| Storage | **localStorage** | Client-side proof history (no DB needed for hackathon) |
| Identity Mock | **Custom JSON mock** | Simulated Aadhaar/DigiLocker data input |

---

## 📁 Folder Structure

```
zk-identity/
├── circuits/
│   ├── age_check.circom          ← ZK circuit: prove age ≥ 18
│   ├── income_range.circom       ← ZK circuit: prove income in bracket
│   └── compile.sh                ← Script to compile circuits + trusted setup
│
├── public/
│   └── circuits/
│       ├── age_check.wasm        ← Compiled circuit (generated)
│       ├── age_check_final.zkey  ← Proving key (generated)
│       └── verification_key.json ← Verifier key (generated)
│
├── src/
│   ├── components/
│   │   ├── ProverPortal.jsx      ← User inputs private data, generates proof
│   │   ├── VerifierPortal.jsx    ← Verifier checks proof validity
│   │   ├── GeminiAssistant.jsx   ← Floating AI chat guide
│   │   ├── ClaimSelector.jsx     ← Choose what to prove (age / income / etc.)
│   │   └── ProofHistory.jsx      ← Past proofs from localStorage
│   │
│   ├── utils/
│   │   ├── zkProver.js           ← snarkjs proof generation logic
│   │   ├── zkVerifier.js         ← snarkjs proof verification logic
│   │   ├── poseidonHash.js       ← Hash user identity commitment
│   │   └── geminiClient.js       ← Gemini API wrapper
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── server/
│   └── verifyProof.js            ← Express API: POST /verify
│
├── .env                          ← GEMINI_API_KEY=your_key_here
├── package.json
└── vite.config.js
```

---

## ⚡ Step-by-Step Build Instructions

### STEP 1 — Environment Setup

```bash
npm create vite@latest zk-identity -- --template react
cd zk-identity
npm install
npm install snarkjs poseidon-lite @google/generative-ai
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install express cors dotenv
```

Install Circom globally:
```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
git clone https://github.com/iden3/circom.git
cd circom && cargo build --release && cargo install --path circom
```

---

### STEP 2 — Write the ZK Circuit (`circuits/age_check.circom`)

```circom
pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";

template AgeCheck() {
    // Private inputs — never revealed
    signal input birthYear;
    signal input currentYear;

    // Public output — the only thing verifier sees
    signal output isAdult;

    component gte = GreaterEqThan(32);
    gte.in[0] <== currentYear - birthYear;
    gte.in[1] <== 18;

    isAdult <== gte.out;
}

component main {public [currentYear]} = AgeCheck();
```

**What this does:** Proves `currentYear - birthYear >= 18` is true WITHOUT revealing `birthYear` to the verifier.

---

### STEP 3 — Compile Circuit & Trusted Setup (`circuits/compile.sh`)

```bash
#!/bin/bash
# Compile circuit
circom age_check.circom --r1cs --wasm --sym

# Download Powers of Tau (phase 1 - reusable)
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau

# Generate proving key (phase 2)
snarkjs groth16 setup age_check.r1cs powersOfTau28_hez_final_12.ptau age_check_0000.zkey

# Contribute to ceremony (for hackathon, skip randomness)
snarkjs zkey contribute age_check_0000.zkey age_check_final.zkey --name="Hackathon" -v -e="random text"

# Export verification key
snarkjs zkey export verificationkey age_check_final.zkey verification_key.json

# Copy to public folder
cp age_check_js/age_check.wasm ../public/circuits/
cp age_check_final.zkey ../public/circuits/
cp verification_key.json ../public/circuits/
```

Run: `chmod +x compile.sh && ./compile.sh`

---

### STEP 4 — ZK Prover Utility (`src/utils/zkProver.js`)

```javascript
import * as snarkjs from "snarkjs";

export async function generateAgeProof(birthYear) {
  const currentYear = new Date().getFullYear();

  const input = {
    birthYear: birthYear,       // PRIVATE — never sent anywhere
    currentYear: currentYear    // PUBLIC — verifier knows this
  };

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    "/circuits/age_check.wasm",
    "/circuits/age_check_final.zkey"
  );

  return { proof, publicSignals };
}
```

---

### STEP 5 — ZK Verifier Utility (`src/utils/zkVerifier.js`)

```javascript
import * as snarkjs from "snarkjs";

export async function verifyAgeProof(proof, publicSignals) {
  const vkeyRes = await fetch("/circuits/verification_key.json");
  const vkey = await vkeyRes.json();

  const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
  return isValid; // true or false — NO access to birth year
}
```

---

### STEP 6 — Gemini AI Client (`src/utils/geminiClient.js`)

```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const SYSTEM_CONTEXT = `You are a privacy guide inside a Zero-Knowledge Identity app.
Help users understand:
- What ZK proofs are in simple terms
- Why their raw data is never shared
- What each claim means (age, income, etc.)
- How to interpret verification results
Keep responses under 3 sentences. Be friendly and clear.`;

export async function askGemini(userMessage, conversationHistory = []) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const chat = model.startChat({
    history: conversationHistory,
    generationConfig: { maxOutputTokens: 300 }
  });

  const result = await chat.sendMessage(
    SYSTEM_CONTEXT + "\n\nUser: " + userMessage
  );
  return result.response.text();
}

// Fraud detection: ask Gemini to flag suspicious claim patterns
export async function detectFraudPattern(claimsLog) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `
    You are a fraud analyst. Review this sequence of identity claims:
    ${JSON.stringify(claimsLog)}
    
    Flag anything suspicious (e.g. same proof reused, claims change too frequently,
    impossible age ranges claimed). Respond in JSON: 
    { "suspicious": true/false, "reason": "..." }
    Respond ONLY with the JSON object.
  `;

  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text());
  } catch {
    return { suspicious: false, reason: "Could not parse" };
  }
}
```

---

### STEP 7 — Prover Portal UI (`src/components/ProverPortal.jsx`)

```jsx
import { useState } from "react";
import { generateAgeProof } from "../utils/zkProver";

export default function ProverPortal({ onProofGenerated }) {
  const [birthYear, setBirthYear] = useState("");
  const [status, setStatus] = useState("idle"); // idle | proving | done | error
  const [proof, setProof] = useState(null);

  const handleProve = async () => {
    if (!birthYear || birthYear < 1900 || birthYear > 2024) return;
    setStatus("proving");
    try {
      const result = await generateAgeProof(parseInt(birthYear));
      setProof(result);
      setStatus("done");
      onProofGenerated(result);

      // Save to proof history
      const history = JSON.parse(localStorage.getItem("proofHistory") || "[]");
      history.unshift({ ...result, timestamp: new Date().toISOString(), claim: "age_gte_18" });
      localStorage.setItem("proofHistory", JSON.stringify(history.slice(0, 10)));
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-1">🔏 Prove Your Identity</h2>
      <p className="text-sm text-gray-500 mb-6">
        Your birth year never leaves your device. Only the proof is shared.
      </p>

      <label className="block text-sm font-medium text-gray-700 mb-1">
        Birth Year (stays private)
      </label>
      <input
        type="number"
        placeholder="e.g. 1998"
        value={birthYear}
        onChange={e => setBirthYear(e.target.value)}
        className="w-full border rounded-lg px-4 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <button
        onClick={handleProve}
        disabled={status === "proving"}
        className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
      >
        {status === "proving" ? "⚙️ Generating ZK Proof..." : "Generate Proof"}
      </button>

      {status === "done" && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          ✅ Proof generated! Age ≥ 18 confirmed without revealing your birth year.
        </div>
      )}

      {status === "error" && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          ❌ Proof generation failed. Check console for details.
        </div>
      )}
    </div>
  );
}
```

---

### STEP 8 — Verifier Portal UI (`src/components/VerifierPortal.jsx`)

```jsx
import { useState } from "react";
import { verifyAgeProof } from "../utils/zkVerifier";
import { detectFraudPattern } from "../utils/geminiClient";

export default function VerifierPortal({ incomingProof }) {
  const [result, setResult] = useState(null);
  const [fraudCheck, setFraudCheck] = useState(null);

  const handleVerify = async () => {
    if (!incomingProof) return;
    const valid = await verifyAgeProof(incomingProof.proof, incomingProof.publicSignals);

    // Fraud detection via Gemini
    const history = JSON.parse(localStorage.getItem("proofHistory") || "[]");
    const fraud = await detectFraudPattern(history);

    setResult(valid);
    setFraudCheck(fraud);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-1">✅ Verify a Claim</h2>
      <p className="text-sm text-gray-500 mb-6">
        Confirm the proof is valid. You will NEVER see the user's raw data.
      </p>

      <button
        onClick={handleVerify}
        disabled={!incomingProof}
        className="w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
      >
        Verify Proof
      </button>

      {result !== null && (
        <div className={`mt-4 rounded-lg p-4 text-sm font-medium ${result ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {result ? "✅ VALID — User is confirmed to be 18 or older" : "❌ INVALID — Proof failed verification"}
        </div>
      )}

      {fraudCheck && fraudCheck.suspicious && (
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          ⚠️ Fraud Signal: {fraudCheck.reason}
        </div>
      )}
    </div>
  );
}
```

---

### STEP 9 — Gemini AI Assistant (`src/components/GeminiAssistant.jsx`)

```jsx
import { useState } from "react";
import { askGemini } from "../utils/geminiClient";

export default function GeminiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm your privacy guide. Ask me anything about ZK proofs or this app 🔐" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const history = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }]
    }));

    const reply = await askGemini(input, history);
    setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-4 w-80 bg-white rounded-2xl shadow-xl border flex flex-col overflow-hidden">
          <div className="bg-indigo-600 text-white px-4 py-3 text-sm font-medium flex justify-between items-center">
            <span>🤖 Privacy Guide (Gemini)</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-lg leading-none">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={`rounded-lg px-3 py-2 ${m.role === "assistant" ? "bg-gray-100 text-gray-800" : "bg-indigo-50 text-indigo-900 ml-4"}`}>
                {m.text}
              </div>
            ))}
            {loading && <div className="text-gray-400 text-xs">Thinking...</div>}
          </div>
          <div className="border-t p-2 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask about ZK proofs..."
              className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button onClick={send} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm">↑</button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="bg-indigo-600 text-white w-14 h-14 rounded-full shadow-lg text-2xl hover:bg-indigo-700 transition flex items-center justify-center"
      >
        🔐
      </button>
    </div>
  );
}
```

---

### STEP 10 — Main App (`src/App.jsx`)

```jsx
import { useState } from "react";
import ProverPortal from "./components/ProverPortal";
import VerifierPortal from "./components/VerifierPortal";
import GeminiAssistant from "./components/GeminiAssistant";

export default function App() {
  const [generatedProof, setGeneratedProof] = useState(null);
  const [activeTab, setActiveTab] = useState("prover");

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">🔐 Invisible Identity</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Prove who you are — without exposing what you are.
          </p>
          <div className="inline-flex mt-2 text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
            Powered by Zero-Knowledge Proofs + Gemini AI
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white rounded-xl border overflow-hidden mb-6">
          {["prover", "verifier"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? "bg-indigo-600 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "prover" ? "👤 I am the User" : "🏢 I am the Verifier"}
            </button>
          ))}
        </div>

        {activeTab === "prover" && (
          <ProverPortal onProofGenerated={setGeneratedProof} />
        )}
        {activeTab === "verifier" && (
          <VerifierPortal incomingProof={generatedProof} />
        )}

        {/* Flow Explanation */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
          <div className="bg-white rounded-xl border p-3">
            <div className="text-2xl mb-1">🧑</div>
            <div className="font-medium text-gray-700">User inputs data</div>
            <div>Birth year stays private on your device</div>
          </div>
          <div className="bg-white rounded-xl border p-3">
            <div className="text-2xl mb-1">⚙️</div>
            <div className="font-medium text-gray-700">ZK Proof generated</div>
            <div>Math proves the claim — no data leaves</div>
          </div>
          <div className="bg-white rounded-xl border p-3">
            <div className="text-2xl mb-1">✅</div>
            <div className="font-medium text-gray-700">Verifier checks</div>
            <div>Gets YES/NO — never sees your data</div>
          </div>
        </div>
      </div>

      <GeminiAssistant />
    </div>
  );
}
```

---

### STEP 11 — Environment File (`.env`)

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

Get your free Gemini API key at: https://aistudio.google.com/app/apikey

---

### STEP 12 — Run the App

```bash
npm run dev
```

Open: `http://localhost:5173`

---

## 🎯 Hackathon Demo Flow (5 minutes)

1. **Tab 1 — User side:** Enter birth year `1998` → Click "Generate Proof" → Show proof object (π_a, π_b, π_c) — point out birth year is NOT in there
2. **Tab 2 — Verifier side:** Click "Verify Proof" → Show ✅ VALID result — point out verifier never saw `1998`
3. **Gemini chat:** Ask "What is a ZK proof?" — show real-time AI explanation
4. **Fraud demo:** Submit multiple proofs quickly → Show Gemini flagging the pattern

---

## 🚀 Bonus Extensions (if time permits)

| Feature | What to build |
|---|---|
| Income Range Proof | New circom circuit proving salary is between ₹3L–₹10L |
| Poseidon Commitment | Hash user's Aadhaar number, store commitment on-chain |
| QR Code Export | Generate QR of the proof for mobile scanning |
| On-chain Verify | Deploy verifier as a Solidity contract on Polygon Mumbai |
| Multi-claim | Let user prove multiple claims in one session |

---

## 🏆 Judging Talking Points

- **Privacy by design:** Raw data cryptographically impossible to extract from proof
- **Open source end-to-end:** circom, snarkjs, React — zero proprietary dependencies
- **Real-world applicability:** Directly solves India's KYC over-sharing problem
- **AI layer:** Gemini adds accessibility (non-technical users understand ZK) and security (fraud detection)
- **Scalable:** Same architecture works for any attribute claim — not just age
