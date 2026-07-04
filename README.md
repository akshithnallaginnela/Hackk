# 🔐 ZeroVault — ZK Identity Verifier

> **Prove who you are — without exposing what you are.**

A privacy-preserving identity verification system using **Zero-Knowledge Proofs** and **Gemini AI**. Built for hackathon glory. 🏆

![Tech Stack](https://img.shields.io/badge/React-Vite-blue?logo=react) ![ZK](https://img.shields.io/badge/ZK-Groth16-purple) ![AI](https://img.shields.io/badge/AI-Gemini-green?logo=google)

---

## 🎯 What It Does

Users can prove specific claims about their identity (age ≥ 18, valid Aadhaar holder, income bracket) to a verifier — **without revealing the actual underlying data**.

| What the user enters | What the verifier sees |
|---|---|
| Birth year: `1998` | ✅ Age ≥ 18: **CONFIRMED** |
| Income: `₹500,000` | ✅ In range ₹3L–₹10L: **CONFIRMED** |
| Aadhaar: `123456789012` | ✅ Valid Aadhaar: **CONFIRMED** |

> The verifier **NEVER** sees the raw data. Only a mathematical proof.

---

## 🏗️ Architecture

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

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Add your Gemini API key to .env
#    VITE_GEMINI_API_KEY=your_key_here
#    Get one free at: https://aistudio.google.com/app/apikey

# 3. Start the app
npm run dev
```

Open: `http://localhost:5174`

---

## 🧪 Demo Flow (5 minutes)

1. **Login Screen** → Unlock with Passkey or enter any PIN
2. **Dashboard** → View stats and quick-action cards
3. **Prover Wallet** → Enter birth year `1998` → Click "Generate Age Proof"
   - Point out: birth year is NOT in the proof output (π_a, π_b, π_c)
4. **Store Terminal** → Click "Verify Proof" → See ✅ VALID
   - Point out: verifier never saw `1998`
5. **AI Chat** → Click the 🔐 button → Ask "What is a ZK proof?"
6. **Fraud Demo** → Generate multiple proofs rapidly → See AI flag the pattern

---

## 🧱 Tech Stack (100% Open Source)

| Layer | Technology | Purpose |
|---|---|---|
| ZK Circuits | **Circom 2.0** | Circuit logic (age, income, identity) |
| ZK Proving | **snarkjs** | Groth16 proofs in browser |
| Frontend | **React + Vite** | Premium light-mode UI |
| AI | **Gemini 2.0 Flash** | Privacy guide + fraud detection |
| Hashing | **Poseidon-style** | ZK-friendly commitments |
| Storage | **localStorage** | Client-side proof history |

---

## 📁 Project Structure

```
zerovault/
├── circuits/
│   ├── age_check.circom          ← Prove age ≥ 18
│   ├── income_range.circom       ← Prove income in bracket
│   └── compile.sh                ← Compilation + trusted setup
├── public/circuits/              ← Compiled circuit artifacts
├── src/
│   ├── components/
│   │   ├── LoginScreen.jsx      ← Passkey / PIN unlock screen
│   │   ├── Dashboard.jsx        ← Unified control panel
│   │   ├── ProverWallet.jsx     ← User proves claims
│   │   ├── VerifierPortal.jsx   ← Verifier checks proofs
│   │   ├── GeminiAssistant.jsx  ← AI privacy guide
│   │   ├── ClaimSelector.jsx    ← Claim type chooser
│   │   └── ProofHistory.jsx     ← Past proofs
│   ├── utils/
│   │   ├── zkProver.js          ← Proof generation
│   │   ├── zkVerifier.js        ← Proof verification
│   │   ├── geminiClient.js      ← Gemini AI wrapper
│   │   └── poseidonHash.js      ← Identity commitments
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css                ← Design system
├── server/
│   └── verifyProof.js           ← Express API
└── .env                          ← Gemini API key
```

---

## 🏆 Why This Wins

- **Privacy by design** — Raw data cryptographically impossible to extract from proof
- **100% open source** — circom, snarkjs, React — zero proprietary dependencies
- **Real-world applicable** — Directly solves India's KYC over-sharing problem
- **AI-powered** — Gemini adds accessibility AND security (fraud detection)
- **Scalable** — Same architecture works for any attribute claim
- **Beautiful** — Premium UI with glassmorphic login, animated dashboard, and smooth micro-interactions

---

## 📄 License

MIT — Built with ❤️ for the hackathon
