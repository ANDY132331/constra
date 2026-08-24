"use client";

/* ─── Particle data (fixed so no hydration mismatch) ─────────────────────── */
const PARTICLES: { size: number; left: string; bottom: string; dur: string; delay: string }[] = [
  { size: 2,   left: "7%",  bottom: "4%",  dur: "4.8s", delay: "0.0s" },
  { size: 1.5, left: "14%", bottom: "12%", dur: "5.6s", delay: "0.7s" },
  { size: 3,   left: "22%", bottom: "6%",  dur: "4.2s", delay: "1.4s" },
  { size: 1.5, left: "31%", bottom: "18%", dur: "6.1s", delay: "0.3s" },
  { size: 2,   left: "38%", bottom: "3%",  dur: "5.0s", delay: "2.1s" },
  { size: 1,   left: "45%", bottom: "22%", dur: "4.7s", delay: "0.9s" },
  { size: 2.5, left: "52%", bottom: "8%",  dur: "5.3s", delay: "1.8s" },
  { size: 1.5, left: "59%", bottom: "14%", dur: "4.4s", delay: "0.5s" },
  { size: 2,   left: "66%", bottom: "5%",  dur: "6.2s", delay: "1.2s" },
  { size: 1,   left: "73%", bottom: "20%", dur: "4.9s", delay: "2.5s" },
  { size: 3,   left: "80%", bottom: "9%",  dur: "5.7s", delay: "0.2s" },
  { size: 1.5, left: "87%", bottom: "15%", dur: "4.5s", delay: "1.6s" },
  { size: 2,   left: "93%", bottom: "3%",  dur: "5.1s", delay: "0.8s" },
  { size: 1,   left: "18%", bottom: "30%", dur: "6.5s", delay: "3.0s" },
  { size: 2,   left: "42%", bottom: "35%", dur: "5.8s", delay: "2.2s" },
  { size: 1.5, left: "70%", bottom: "28%", dur: "4.6s", delay: "1.0s" },
  { size: 2.5, left: "88%", bottom: "33%", dur: "5.4s", delay: "3.5s" },
  { size: 1,   left: "55%", bottom: "40%", dur: "6.8s", delay: "1.5s" },
];

const LETTERS = ["C", "O", "N", "S", "T", "R", "A"];

export function SplashScreen({ exiting = false }: { exiting?: boolean }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background: "#080808",
        transition: "opacity 0.7s cubic-bezier(0.4,0,0.2,1), transform 0.7s cubic-bezier(0.4,0,0.2,1)",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.06)" : "scale(1)",
        pointerEvents: exiting ? "none" : "auto",
      }}
      aria-hidden="true"
    >
      <style>{`
        /* ── Blueprint grid ── */
        @keyframes ss-gridIn  { from { opacity:0 } to { opacity:0.035 } }
        .ss-grid { animation: ss-gridIn 1.2s 0.1s ease both; }

        /* ── Building frame ── */
        @keyframes ss-draw { to { stroke-dashoffset: 0 } }
        .ss-bframe  { stroke-dasharray: 230; stroke-dashoffset: 230;
                      animation: ss-draw 0.95s 0.2s cubic-bezier(0.4,0,0.2,1) forwards; }
        .ss-bfloors { stroke-dasharray: 130; stroke-dashoffset: 130;
                      animation: ss-draw 0.55s 0.85s cubic-bezier(0.4,0,0.2,1) forwards; }
        .ss-center  { stroke-dasharray: 90;  stroke-dashoffset: 90;
                      animation: ss-draw 0.45s 0.9s  cubic-bezier(0.4,0,0.2,1) forwards; }

        /* ── Windows ── */
        @keyframes ss-win {
          0%   { opacity:0; transform:scale(0.2); }
          65%  { opacity:0.9; transform:scale(1.2); }
          100% { opacity:0.75; transform:scale(1); }
        }
        .ss-w1 { animation: ss-win 0.45s 0.95s ease both; }
        .ss-w2 { animation: ss-win 0.45s 1.02s ease both; }
        .ss-w3 { animation: ss-win 0.45s 1.08s ease both; }
        .ss-w4 { animation: ss-win 0.45s 1.13s ease both; }
        .ss-w5 { animation: ss-win 0.45s 1.18s ease both; }
        .ss-w6 { animation: ss-win 0.45s 1.23s ease both; }

        /* ── Glow pulse ── */
        @keyframes ss-glow { 0%,100%{opacity:0.07} 50%{opacity:0.2} }
        .ss-glow { animation: ss-glow 2.8s 1.2s ease-in-out infinite; opacity:0; }

        /* ── Letters ── */
        @keyframes ss-letter {
          from { opacity:0; transform:translateY(22px) scaleY(0.7); }
          to   { opacity:1; transform:translateY(0)   scaleY(1);   }
        }
        .ss-letter { opacity:0; display:inline-block; transform-origin:bottom center;
                     animation: ss-letter 0.42s cubic-bezier(0.34,1.56,0.64,1) forwards; }

        /* ── Tagline ── */
        @keyframes ss-tag { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .ss-tag { opacity:0; animation: ss-tag 0.7s 1.9s ease both; }

        /* ── Progress bar ── */
        @keyframes ss-bar { from{width:0%} to{width:100%} }
        .ss-bar { animation: ss-bar 1.55s 1.25s cubic-bezier(0.4,0,0.6,1) forwards; width:0%; }

        /* ── Particles ── */
        @keyframes ss-particle {
          0%   { opacity:0; transform:translateY(0)     scale(1);   }
          15%  { opacity:0.9; }
          85%  { opacity:0.35; }
          100% { opacity:0; transform:translateY(-140px) scale(0.3); }
        }
        .ss-p { animation: ss-particle var(--pdur) var(--pdelay) ease-in infinite; position:absolute; border-radius:9999px; background:#F5C400; }

        /* ── Amber glow on bar ── */
        .ss-bar-wrap { position:absolute; bottom:0; left:0; right:0; height:2px; background:rgba(255,255,255,0.04); }
        .ss-bar { height:100%; background:#F5C400; box-shadow: 0 0 10px 1px #F5C40088; }

        /* ── Icon entrance ── */
        @keyframes ss-icon { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .ss-icon { animation: ss-icon 0.5s 0.15s ease both; }
      `}</style>

      {/* Blueprint grid */}
      <div className="ss-grid absolute inset-0 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="ss-grid" width="52" height="52" patternUnits="userSpaceOnUse">
              <path d="M52 0L0 0 0 52" fill="none" stroke="#F5C400" strokeWidth="0.45" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ss-grid)" />
        </svg>
      </div>

      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="ss-p"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            bottom: p.bottom,
            "--pdur": p.dur,
            "--pdelay": p.delay,
          } as React.CSSProperties}
        />
      ))}

      {/* Centre content */}
      <div className="relative z-10 flex flex-col items-center" style={{ gap: 28 }}>

        {/* Building mark */}
        <div className="ss-icon relative">
          <svg width="76" height="92" viewBox="0 0 76 92" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Ambient glow (behind) */}
            <path
              className="ss-glow"
              d="M9 92V23L38 5L67 23V92"
              stroke="#F5C400"
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Main frame */}
            <path
              className="ss-bframe"
              d="M9 92V23L38 5L67 23V92"
              stroke="#F5C400"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Floor lines + center divider */}
            <path
              className="ss-bfloors"
              d="M9 46H67 M9 67H67"
              stroke="#F5C400"
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity="0.38"
            />
            <path
              className="ss-center"
              d="M38 23V92"
              stroke="#F5C400"
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity="0.28"
            />
            {/* Windows — left */}
            <rect className="ss-w1" x="14" y="28"  width="14" height="12" rx="2" fill="#F5C400" opacity="0" />
            <rect className="ss-w3" x="14" y="50"  width="14" height="11" rx="2" fill="#F5C400" opacity="0" />
            <rect className="ss-w5" x="14" y="71"  width="14" height="11" rx="2" fill="#F5C400" opacity="0" />
            {/* Windows — right */}
            <rect className="ss-w2" x="48" y="28"  width="14" height="12" rx="2" fill="#F5C400" opacity="0" />
            <rect className="ss-w4" x="48" y="50"  width="14" height="11" rx="2" fill="#F5C400" opacity="0" />
            <rect className="ss-w6" x="48" y="71"  width="14" height="11" rx="2" fill="#F5C400" opacity="0" />
          </svg>
        </div>

        {/* CONSTRA wordmark — staggered letters */}
        <div className="flex items-end" style={{ gap: "0.14em" }}>
          {LETTERS.map((ch, i) => (
            <span
              key={i}
              className="ss-letter text-[34px] font-bold text-white"
              style={{
                animationDelay: `${1.12 + i * 0.06}s`,
                fontFamily: "var(--font-geist-sans)",
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}
            >
              {ch}
            </span>
          ))}
        </div>

        {/* Tagline */}
        <p
          className="ss-tag text-[10.5px] tracking-[0.22em] uppercase"
          style={{ color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-geist-sans)" }}
        >
          Field Workforce &middot; Construction &amp; Trades
        </p>
      </div>

      {/* Progress bar */}
      <div className="ss-bar-wrap">
        <div className="ss-bar" />
      </div>
    </div>
  );
}
