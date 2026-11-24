import type { SubjectKind } from "@/lib/measurement"

function art(kind: SubjectKind) {
  switch (kind) {
    case "passive":
      return (
        <>
          <line x1="0" y1="30" x2="26" y2="30" stroke="#b9b2a2" strokeWidth="2" />
          <line x1="74" y1="30" x2="100" y2="30" stroke="#b9b2a2" strokeWidth="2" />
          <rect x="26" y="20" width="48" height="20" rx="4" fill="#d8c49c" stroke="#8a6f3f" />
          <rect x="34" y="20" width="4" height="20" fill="#6b4a2f" />
          <rect x="41" y="20" width="4" height="20" fill="#c0392b" />
          <rect x="48" y="20" width="4" height="20" fill="#d9a441" />
          <rect x="62" y="20" width="4" height="20" fill="#c9a227" />
        </>
      )
    case "diode":
      return (
        <>
          <line x1="0" y1="30" x2="30" y2="30" stroke="#b9b2a2" strokeWidth="2" />
          <line x1="70" y1="30" x2="100" y2="30" stroke="#b9b2a2" strokeWidth="2" />
          <rect x="30" y="21" width="40" height="18" rx="3" fill="#25282c" stroke="#111316" />
          <rect x="60" y="21" width="5" height="18" fill="#cfd3d6" />
          <path d="M44 24 L54 30 L44 36 Z" fill="#8d8f92" />
        </>
      )
    case "led":
      return (
        <>
          <line x1="14" y1="46" x2="38" y2="28" stroke="#b9b2a2" strokeWidth="2" />
          <line x1="86" y1="46" x2="62" y2="28" stroke="#b9b2a2" strokeWidth="2" />
          <path d="M38 34 A14 14 0 0 1 62 34 Z" fill="#d3392b" stroke="#8e1f16" />
          <rect x="36" y="33" width="28" height="5" rx="2.5" fill="#a72a1f" />
          <circle cx="50" cy="26" r="5" fill="#e8695c" opacity="0.75" />
        </>
      )
    case "capacitor":
      return (
        <>
          <line x1="0" y1="30" x2="34" y2="30" stroke="#b9b2a2" strokeWidth="2" />
          <line x1="66" y1="30" x2="100" y2="30" stroke="#b9b2a2" strokeWidth="2" />
          <rect x="34" y="12" width="32" height="36" rx="3" fill="#26456f" stroke="#152741" />
          <rect x="34" y="12" width="6" height="36" fill="#c3ccd6" />
          <line x1="48" y1="12" x2="48" y2="8" stroke="#b9b2a2" strokeWidth="2" />
        </>
      )
    case "battery":
      return (
        <>
          <line x1="0" y1="30" x2="24" y2="30" stroke="#b9b2a2" strokeWidth="2" />
          <line x1="76" y1="30" x2="100" y2="30" stroke="#b9b2a2" strokeWidth="2" />
          <rect x="24" y="17" width="50" height="26" rx="5" fill="#2f3338" stroke="#15181b" />
          <rect x="24" y="22" width="50" height="5" fill="#b8912f" />
          <rect x="74" y="24" width="4" height="12" rx="2" fill="#c8c3b4" />
          <text x="49" y="38" textAnchor="middle" fontSize="8" fill="#cfc6ae" fontFamily="ui-sans-serif">
            +
          </text>
        </>
      )
    case "mains":
      return (
        <>
          <rect x="28" y="6" width="44" height="48" rx="5" fill="#e6e2d8" stroke="#8d8a80" />
          <circle cx="42" cy="24" r="4.5" fill="#23262a" />
          <circle cx="58" cy="24" r="4.5" fill="#23262a" />
          <path d="M50 34 L44 42 L49 42 L48 50 L56 40 L51 40 Z" fill="#c0392b" />
        </>
      )
    case "transistor":
      return (
        <>
          <line x1="34" y1="34" x2="34" y2="58" stroke="#b9b2a2" strokeWidth="2" />
          <line x1="50" y1="34" x2="50" y2="58" stroke="#b9b2a2" strokeWidth="2" />
          <line x1="66" y1="34" x2="66" y2="58" stroke="#b9b2a2" strokeWidth="2" />
          <path d="M28 34 A22 22 0 0 1 72 34 Z" fill="#23262a" stroke="#101214" />
          <text x="50" y="29" textAnchor="middle" fontSize="9" fill="#9aa1a9" fontFamily="ui-sans-serif">
            3904
          </text>
        </>
      )
    case "open":
      return (
        <>
          <circle cx="26" cy="30" r="6" fill="#c9a227" />
          <circle cx="74" cy="30" r="6" fill="#c9a227" />
          <line x1="34" y1="30" x2="44" y2="30" stroke="#b9b2a2" strokeWidth="2" />
          <line x1="56" y1="30" x2="66" y2="30" stroke="#b9b2a2" strokeWidth="2" />
        </>
      )
    case "short":
      return (
        <>
          <circle cx="24" cy="30" r="6" fill="#c9a227" />
          <circle cx="76" cy="30" r="6" fill="#c9a227" />
          <line x1="30" y1="30" x2="70" y2="30" stroke="#b9b2a2" strokeWidth="2" />
          <ellipse cx="50" cy="30" rx="14" ry="7" fill="#b9bdc2" stroke="#7d8288" />
          <ellipse cx="47" cy="27" rx="5" ry="2.4" fill="#e6e9ec" opacity="0.8" />
        </>
      )
  }
}

export function Glyph({ kind }: { kind: SubjectKind }) {
  return (
    <svg className="glyph" viewBox="0 0 100 60" aria-hidden="true" focusable="false">
      {art(kind)}
    </svg>
  )
}
