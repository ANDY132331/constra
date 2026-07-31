// Background verification — silent checks run after every clock-in.
// All functions return null when the check passes or cannot be evaluated.

import type { ClockEntry, Worker, Project, GpsLocation, VerificationFlag } from "./mock-data";

// ── Geometry ──────────────────────────────────────────────────────────────────

function haversineKm(a: GpsLocation, b: GpsLocation): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const chord =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
}

// ── Check 1: Impossible travel ────────────────────────────────────────────────
// Flags when the speed required to travel from the last clock-out location
// to this clock-in location is physically unreasonable.

export function checkImpossibleTravel(
  entry: Pick<ClockEntry, "workerId" | "clockIn" | "gps">,
  pastEntries: ClockEntry[],
): VerificationFlag | null {
  if (!entry.gps) return null;

  const last = pastEntries
    .filter((e) => e.workerId === entry.workerId && e.clockOut && e.gps)
    .sort((a, b) => b.clockIn.getTime() - a.clockIn.getTime())[0];

  if (!last?.clockOut || !last.gps) return null;

  const distKm = haversineKm(last.gps, entry.gps);
  const elapsedH = (entry.clockIn.getTime() - last.clockOut.getTime()) / 3_600_000;

  if (elapsedH <= 0 || distKm < 0.05) return null; // overlapping or same spot

  const speedKmh = distKm / elapsedH;

  if (speedKmh > 900) {
    return {
      type: "impossible-travel",
      severity: "high",
      note: `${distKm.toFixed(0)} km in ${elapsedH.toFixed(1)} h (${speedKmh.toFixed(0)} km/h) — exceeds commercial aviation speed`,
      detectedAt: new Date(),
    };
  }
  if (speedKmh > 300) {
    return {
      type: "impossible-travel",
      severity: "medium",
      note: `${distKm.toFixed(0)} km in ${elapsedH.toFixed(1)} h (${speedKmh.toFixed(0)} km/h) — requires air travel`,
      detectedAt: new Date(),
    };
  }
  return null;
}

// ── Check 2: Off-site ─────────────────────────────────────────────────────────
// Flags when the clock-in GPS is further than `radiusMetres` from the
// project's recorded site GPS. Skipped when project.gps is not set.

export function checkOffSite(
  gps: GpsLocation,
  project: Project,
  radiusMetres = 2000,
): VerificationFlag | null {
  if (!project.gps) return null;

  const distM = haversineKm(gps, project.gps) * 1000;
  if (distM <= radiusMetres) return null;

  const severity = distM > radiusMetres * 5 ? "high" : "medium";
  return {
    type: "off-site",
    severity,
    note: `${distM.toFixed(0)} m from project site "${project.name}" (limit: ${radiusMetres} m)`,
    detectedAt: new Date(),
  };
}

// ── Check 3: Duplicate / reused image ────────────────────────────────────────
// Downscales the JPEG to an 8×8 luminance grid and computes a perceptual hash
// (pHash). Two hashes with Hamming distance ≤ threshold are considered the
// same scene. Runs only in the browser (canvas API).

async function pHash(dataUrl: string): Promise<string> {
  if (typeof document === "undefined") return "";
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 8;
        canvas.height = 8;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(""); return; }
        ctx.drawImage(img, 0, 0, 8, 8);
        const { data } = ctx.getImageData(0, 0, 8, 8);
        const luma: number[] = [];
        let sum = 0;
        for (let i = 0; i < 64; i++) {
          const l = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
          luma.push(l);
          sum += l;
        }
        const mean = sum / 64;
        resolve(luma.map((l) => (l >= mean ? "1" : "0")).join(""));
      } catch {
        resolve("");
      }
    };
    img.onerror = () => resolve("");
    img.src = dataUrl;
  });
}

function hammingDistance(a: string, b: string): number {
  let d = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) if (a[i] !== b[i]) d++;
  return d;
}

export async function checkDuplicateImage(
  photoDataUrl: string,
  pastEntries: ClockEntry[],
  similarityThreshold = 8, // out of 64 bits — lower = stricter
): Promise<VerificationFlag | null> {
  const newHash = await pHash(photoDataUrl);
  if (!newHash) return null;

  const candidates = pastEntries.filter((e) => e.clockInPhoto);

  for (const entry of candidates) {
    const existingHash = await pHash(entry.clockInPhoto!);
    if (!existingHash) continue;
    const dist = hammingDistance(newHash, existingHash);
    if (dist <= similarityThreshold) {
      const score = 64 - dist;
      return {
        type: "duplicate-image",
        severity: dist === 0 ? "high" : "medium",
        note: `Photo matches a previous clock-in (similarity ${score}/64) — possible photo reuse`,
        detectedAt: new Date(),
      };
    }
  }
  return null;
}

// ── Check 4: New / unrecognised device ───────────────────────────────────────
// Low-severity notice when a worker clocks in from a device not seen before.
// Per product spec this is informational only — workers replace phones.

export function checkNewDevice(
  deviceInfo: string,
  worker: Worker,
): VerificationFlag | null {
  const history = worker.deviceHistory ?? [];
  if (history.length === 0) return null; // first ever device — expected
  const known = history.some((d) => d.ua === deviceInfo);
  if (known) return null;

  return {
    type: "multiple-devices",
    severity: "low",
    note: `Clock-in from a device not previously seen for this worker`,
    detectedAt: new Date(),
  };
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export type VerificationInput = {
  entry: Omit<ClockEntry, "id">;
  worker: Worker;
  project: Project | undefined;
  pastEntries: ClockEntry[]; // entries already committed (excludes the new one)
};

export async function runVerification({
  entry,
  worker,
  project,
  pastEntries,
}: VerificationInput): Promise<VerificationFlag[]> {
  const flags: VerificationFlag[] = [];

  if (entry.gps && project) {
    const offSiteFlag = checkOffSite(entry.gps, project);
    if (offSiteFlag) flags.push(offSiteFlag);
  }

  if (entry.clockInPhoto) {
    const dupFlag = await checkDuplicateImage(entry.clockInPhoto, pastEntries);
    if (dupFlag) flags.push(dupFlag);
  }

  if (entry.deviceInfo) {
    const deviceFlag = checkNewDevice(entry.deviceInfo, worker);
    if (deviceFlag) flags.push(deviceFlag);
  }

  return flags;
}
