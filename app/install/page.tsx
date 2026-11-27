import Link from "next/link";
import type { Metadata } from "next";
import { HardHat, Share, SquarePlus, Smartphone, ArrowLeft } from "lucide-react";
import { PLAY_STORE_URL } from "@/lib/store-app";

export const metadata: Metadata = {
  title: "Get Constra on your phone",
  description: "Install Constra on Android from Google Play, or add it to your iPhone home screen from Safari in three taps. Free while we launch.",
  alternates: { canonical: "https://getconstra.com/install" },
};

const IPHONE_STEPS: { icon: typeof Share; title: string; text: string }[] = [
  { icon: Smartphone, title: "Open getconstra.com in Safari", text: "It has to be Safari. Chrome on iPhone can't add apps to the home screen." },
  { icon: Share, title: "Tap the Share button", text: "The square with an arrow pointing up, at the bottom of the screen (top right on iPad)." },
  { icon: SquarePlus, title: "Tap “Add to Home Screen”, then Add", text: "Scroll down the list if you don't see it. Constra now opens from its own icon, full screen, like any other app." },
];

export default function InstallPage() {
  return (
    <main className="h-[100dvh] overflow-y-auto bg-[#0a0a0a] text-white px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="inline-flex items-center gap-2 text-[13px] text-white/60 hover:text-white min-h-[44px]">
          <ArrowLeft size={16} aria-hidden /> getconstra.com
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <div className="w-11 h-11 bg-[#F5C400] rounded-xl flex items-center justify-center">
            <HardHat size={22} className="text-[#1A1600]" aria-hidden />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/60">Constra · free while we launch</p>
        </div>
        <h1 className="mt-4 font-[family-name:var(--font-display,'Barlow_Condensed')] text-[44px] leading-[0.95] font-extrabold uppercase">Get Constra on your phone</h1>
        <p className="mt-3 text-[16px] text-white/70">Same account on every phone and computer. Your crew installs it the same way.</p>

        <section aria-labelledby="android" className="mt-10 rounded-2xl border border-white/10 bg-[#111] p-5">
          <h2 id="android" className="text-[22px] font-bold">Android</h2>
          <p className="mt-1 text-[14px] text-white/70">Get it from Google Play.</p>
          {PLAY_STORE_URL ? (
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-[48px] items-center rounded-full bg-[#F5C400] px-6 font-bold text-[#1A1600] hover:bg-[#ffd21f]">
              Get it on Google Play
            </a>
          ) : (
            <p className="mt-3 text-[14px]">In Chrome, open getconstra.com, tap <b>⋮</b>, then <b>Install app</b>.</p>
          )}
        </section>

        <section aria-labelledby="iphone" className="mt-4 rounded-2xl border border-white/10 bg-[#111] p-5">
          <h2 id="iphone" className="text-[22px] font-bold">iPhone and iPad</h2>
          <p className="mt-1 text-[14px] text-white/70">Not in the App Store yet. Add it to your home screen instead. It takes about 20 seconds.</p>
          <ol className="mt-5 space-y-4">
            {IPHONE_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] font-bold text-amber-400">{i + 1}</span>
                <div>
                  <p className="flex items-center gap-2 font-semibold"><s.icon size={16} aria-hidden className="text-amber-400" />{s.title}</p>
                  <p className="mt-0.5 text-[14px] text-white/65">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link href="/login" className="mt-6 inline-flex min-h-[48px] items-center rounded-full border border-white/15 px-6 font-semibold hover:bg-white/[0.06]">
            Open Constra
          </Link>
        </section>

        <p className="mt-8 text-[13px] text-white/60">
          Stuck? Email <a href="mailto:support@getconstra.com" className="text-amber-400 underline">support@getconstra.com</a>.
        </p>
      </div>
    </main>
  );
}
