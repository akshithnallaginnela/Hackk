import { useState } from "react";

const CLAIMS = [
  {
    id: "age_gte_18",
    label: "Age ≥ 18",
    emoji: "🎂",
    description: "Prove you're an adult",
  },
  {
    id: "income_range",
    label: "Income Range",
    emoji: "💰",
    description: "Prove salary bracket",
  },
  {
    id: "aadhaar_valid",
    label: "Aadhaar Valid",
    emoji: "🪪",
    description: "Prove ID validity",
  },
];

export default function ClaimSelector({ selectedClaim, onSelect }) {
  return (
    <div className="claim-selector">
      {CLAIMS.map((claim) => (
        <button
          key={claim.id}
          className={`claim-chip ${selectedClaim === claim.id ? "active" : ""}`}
          onClick={() => onSelect(claim.id)}
        >
          <span className="claim-emoji">{claim.emoji}</span>
          <span>{claim.label}</span>
        </button>
      ))}
    </div>
  );
}
