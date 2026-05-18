import React, { useMemo } from "react";
import { CheckCircle2, Circle } from "lucide-react";

/**
 * Returns an object describing password strength:
 *  - rules: list of { id, label, met }
 *  - score: 0..5 (count of rules met)
 *  - allMet: bool
 */
export function evaluatePasswordStrength(pw) {
  const rules = [
    { id: "len", label: "Cel puțin 8 caractere", met: !!pw && pw.length >= 8 },
    { id: "upper", label: "O literă mare (A–Z)", met: /[A-Z]/.test(pw || "") },
    { id: "lower", label: "O literă mică (a–z)", met: /[a-z]/.test(pw || "") },
    { id: "digit", label: "O cifră (0–9)", met: /\d/.test(pw || "") },
    {
      id: "special",
      label: "Un caracter special (!@#$…)",
      met: /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(pw || ""),
    },
  ];
  const score = rules.filter((r) => r.met).length;
  return { rules, score, allMet: score === rules.length };
}

/** Visual password strength meter with rule checklist. */
export default function PasswordStrengthMeter({ password, className = "" }) {
  const { rules, score } = useMemo(
    () => evaluatePasswordStrength(password),
    [password]
  );

  const segments = 5;
  const colors = [
    "bg-red-500",       // 1
    "bg-orange-500",    // 2
    "bg-yellow-500",    // 3
    "bg-lime-500",      // 4
    "bg-emerald-500",   // 5
  ];
  const label =
    !password ? "" :
    score <= 1 ? "Foarte slabă" :
    score === 2 ? "Slabă" :
    score === 3 ? "Acceptabilă" :
    score === 4 ? "Bună" :
    "Excelentă";

  return (
    <div className={className}>
      {/* segments */}
      <div className="flex gap-1.5 mb-2">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i < score ? colors[score - 1] : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="text-muted-foreground">Putere parolă</span>
        <span
          className={`font-semibold ${
            score === 0 ? "text-muted-foreground" :
            score <= 2 ? "text-red-400" :
            score === 3 ? "text-yellow-400" :
            "text-emerald-400"
          }`}
        >
          {label}
        </span>
      </div>
      <ul className="space-y-1.5">
        {rules.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-xs">
            {r.met ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            )}
            <span className={r.met ? "text-foreground/80" : "text-muted-foreground"}>
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
