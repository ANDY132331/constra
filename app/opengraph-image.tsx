import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Constra — Field Workforce Management for Construction & Trades";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FEATURES = [
  "Time Tracking",
  "GPS Verification",
  "Invoicing",
  "Safety Logs",
  "Crew Management",
  "AI Daily Brief",
];

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0a",
          padding: "64px 72px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Amber glow top-left */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            left: "-100px",
            width: "700px",
            height: "700px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at center, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 45%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "15%",
            width: "70%",
            height: "2px",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.8) 50%, transparent 100%)",
            display: "flex",
          }}
        />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              background: "#F5C400",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              fontWeight: "900",
              color: "#000",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            C
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span
              style={{
                fontSize: "28px",
                fontWeight: "900",
                color: "#ffffff",
                letterSpacing: "-0.5px",
                lineHeight: "1",
                display: "flex",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Constra
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "rgba(255,255,255,0.25)",
                fontWeight: "700",
                letterSpacing: "3.5px",
                display: "flex",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              WORKFORCE OS
            </span>
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "52px",
            gap: "0px",
          }}
        >
          <span
            style={{
              fontSize: "64px",
              fontWeight: "900",
              color: "#ffffff",
              lineHeight: "1.08",
              letterSpacing: "-2px",
              display: "flex",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            The first app that runs
          </span>
          <div style={{ display: "flex", gap: "18px", alignItems: "baseline" }}>
            <span
              style={{
                fontSize: "64px",
                fontWeight: "900",
                color: "#ffffff",
                lineHeight: "1.08",
                letterSpacing: "-2px",
                display: "flex",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              your
            </span>
            <span
              style={{
                fontSize: "64px",
                fontWeight: "900",
                color: "#F5C400",
                lineHeight: "1.08",
                letterSpacing: "-2px",
                display: "flex",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              entire
            </span>
            <span
              style={{
                fontSize: "64px",
                fontWeight: "900",
                color: "#ffffff",
                lineHeight: "1.08",
                letterSpacing: "-2px",
                display: "flex",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              job site
            </span>
          </div>
        </div>

        {/* Subtext */}
        <div
          style={{
            marginTop: "20px",
            fontSize: "21px",
            color: "rgba(255,255,255,0.40)",
            lineHeight: "1.4",
            display: "flex",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Time tracking, invoicing, crew management, safety logs — built for construction.
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "32px",
            flexWrap: "wrap",
          }}
        >
          {FEATURES.map((label) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.055)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: "100px",
                padding: "10px 22px",
                fontSize: "15px",
                color: "rgba(255,255,255,0.50)",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            paddingTop: "28px",
            marginTop: "auto",
          }}
        >
          <span
            style={{
              fontSize: "17px",
              color: "rgba(255,255,255,0.25)",
              fontWeight: "700",
              display: "flex",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            getconstra.com
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(245,158,11,0.10)",
              border: "1px solid rgba(245,158,11,0.22)",
              borderRadius: "100px",
              padding: "10px 24px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#F5C400",
                display: "flex",
              }}
            />
            <span
              style={{
                fontSize: "15px",
                color: "#F5C400",
                fontWeight: "700",
                display: "flex",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Free beta · All features included · No credit card
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
