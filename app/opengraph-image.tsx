import { ImageResponse } from "next/og";

export const alt = "Constra: run the job, not the paperwork. Field workforce management for construction and trades.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#151617";
const GROUND = "#E7E5E0";
const PAPER = "#F5F4F1";
const HV = "#F5C400";

// Satori needs TTF/OTF; Google Fonts serves TTF to clients that don't advertise woff2 support.
async function loadFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

function Tape() {
  return (
    <div style={{ display: "flex", width: "100%", height: 22, overflow: "hidden", background: HV }}>
      {Array.from({ length: 40 }, (_, i) => (
        <div key={i} style={{ width: 22, height: 44, marginLeft: i === 0 ? -12 : 22, marginTop: -11, background: INK, transform: "skewX(-45deg)" }} />
      ))}
    </div>
  );
}

export default async function OGImage() {
  const [display, mono] = await Promise.all([loadFont("Barlow+Condensed", 800), loadFont("IBM+Plex+Mono", 500)]);
  const fonts = [
    ...(display ? [{ name: "Display", data: display, weight: 800 as const, style: "normal" as const }] : []),
    ...(mono ? [{ name: "Mono", data: mono, weight: 500 as const, style: "normal" as const }] : []),
  ];
  const D = display ? "Display" : "sans-serif";
  const M = mono ? "Mono" : "monospace";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: GROUND, color: INK }}>
        <Tape />
        <div style={{ flex: 1, display: "flex", padding: "54px 72px 0", gap: 56 }}>
          {/* Copy */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: M, fontSize: 20, letterSpacing: 3, color: "#4B4D50" }}>
              <div style={{ width: 30, height: 12, background: INK }} />
              FOR CONTRACTORS AND TRADE CREWS
            </div>
            <div style={{ display: "flex", flexDirection: "column", fontFamily: D, fontWeight: 800, fontSize: 132, lineHeight: 0.9, marginTop: 26, letterSpacing: -1 }}>
              <span>RUN THE JOB.</span>
              <span>NOT THE</span>
              <span>PAPERWORK.</span>
            </div>
          </div>

          {/* Clock-in card */}
          <div style={{ width: 330, display: "flex", flexDirection: "column", alignSelf: "flex-start", marginTop: 8, background: INK, color: "#ECEAE5", borderRadius: 30, padding: 14, boxShadow: "14px 14px 0 #F5C400" }}>
            <div style={{ display: "flex", flexDirection: "column", background: "#101112", borderRadius: 20, padding: "22px 22px 24px" }}>
              <div style={{ display: "flex", fontFamily: M, fontSize: 15, color: "#9A9C9F" }}>Dundas St. Reno</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, fontSize: 18, color: "#5BD08A" }}>
                <div style={{ width: 11, height: 11, borderRadius: 11, background: "#5BD08A" }} />
                On site · 06:58 in
              </div>
              <div style={{ display: "flex", alignItems: "baseline", fontFamily: D, fontWeight: 800, fontSize: 84, lineHeight: 1, marginTop: 10 }}>
                4:12<span style={{ fontSize: 46, color: "#9A9C9F" }}>:08</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 17, color: "#9A9C9F" }}>
                <span>38 m from site</span><span style={{ color: "#5BD08A" }}>Verified</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 17, color: "#9A9C9F" }}>
                <span>Photo on punch</span><span style={{ color: "#5BD08A" }}>Verified</span>
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 20, background: HV, color: "#1A1600", borderRadius: 12, padding: "13px 0", fontSize: 20, fontWeight: 700 }}>
                Clock out
              </div>
            </div>
          </div>
        </div>

        {/* Footer bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: PAPER, borderTop: `2px solid ${INK}`, padding: "22px 72px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, background: HV, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: D, fontWeight: 800, fontSize: 28 }}>C</div>
            <span style={{ fontFamily: D, fontWeight: 800, fontSize: 34, letterSpacing: 1 }}>CONSTRA</span>
          </div>
          <div style={{ display: "flex", gap: 28, fontFamily: M, fontSize: 19, color: "#4B4D50" }}>
            <span>GPS timesheets</span>
            <span>Daily reports</span>
            <span>Invoices</span>
            <span style={{ color: INK }}>getconstra.com</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
