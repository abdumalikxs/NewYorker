import { ArrowRight, PlayCircle, Eye, AudioLines, TrainFront, Wallet, CloudSun, Globe } from "lucide-react";

const APP_PATH = "/app";

const CAPABILITIES = [
  {
    icon: Eye,
    title: "It sees your street",
    body: "Point your camera at a station sign, a storefront, or a menu. Gemini reads the scene live, so you can just ask “what is this?” instead of describing it.",
  },
  {
    icon: AudioLines,
    title: "It talks like a person",
    body: "ElevenLabs gives JARVIS a real voice that answers out loud in under a second — in the language you asked in. Say “switch to Russian”, or Spanish, or Bengali, and the whole conversation follows you.",
  },
  {
    icon: TrainFront,
    title: "It knows the subway",
    body: "Ask for Times Square to Columbia and you get the actual train, the transfer, and the ride time — drawn on a live map instead of read out as a list.",
  },
  {
    icon: Wallet,
    title: "It watches your fare",
    body: "Capital One keeps the money honest: ask if you can afford the trip and it checks your real balance against the $2.90 swipe. It never brings it up otherwise.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Open it on your phone",
    body: "No install. The camera and microphone light up in the browser, and JARVIS starts watching the street with you.",
  },
  {
    n: "02",
    title: "Just talk",
    body: "Speak a whole sentence like you would to a friend. It waits for you to finish, answers once, and never talks over itself.",
  },
  {
    n: "03",
    title: "Watch the HUD react",
    body: "Routes, weather, and fares appear as cards on the viewfinder while it speaks, then clear themselves so the glass stays readable.",
  },
];

const STACK = [
  "Gemini 3.5 Flash", "ElevenLabs", "Capital One", "Grok", "Cursor",
  "Open-Meteo", "Supabase", "OpenStreetMap",
];

// New York speaks more than 800 languages; these are the ones you hear on the platform.
const ABILITIES = [
  "Live camera vision",
  "Subway routing",
  "Weather by the hour",
  "Fare vs. balance",
  "Speaks in ~1 second",
  "Any language",
];

const TECH = [
  "React", "TypeScript", "Vite", "Tailwind CSS", "FastAPI", "Python 3.12",
  "WebSockets", "Leaflet", "PostgreSQL", "Docker",
];

const LANGUAGES = [
  "English", "Español", "Русский", "中文", "বাংলা", "Kreyòl ayisyen", "العربية",
  "한국어", "Français", "اردو", "Oʻzbek", "Тоҷикӣ", "Polski", "Tiếng Việt", "עברית", "Italiano",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      {/* Pastel wash behind the fold — the only colour on an otherwise white page. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[900px] overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[#FCCC0A]/10 blur-3xl" />
        <div className="absolute top-52 -left-32 h-[420px] w-[520px] rounded-full bg-[#0039A6]/10 blur-3xl" />
        <div className="absolute top-72 -right-32 h-[420px] w-[520px] rounded-full bg-[#EE352E]/[0.07] blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-neutral-900/5 bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href={APP_PATH} className="flex items-center gap-2.5">
            <span className="mta-bullet mta-yellow h-7 w-7 text-[13px]">N</span>
            <span className="text-[15px] font-semibold tracking-tight">New Yorker</span>
          </a>

          <div className="hidden items-center gap-9 text-[14px] text-neutral-600 md:flex">
            <a href="#hud" className="transition-colors hover:text-neutral-900">The HUD</a>
            <a href="#how" className="transition-colors hover:text-neutral-900">How it works</a>
            <a href="#stack" className="transition-colors hover:text-neutral-900">Built with</a>
          </div>

          <a
            href={APP_PATH}
            className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-neutral-900/10 transition-colors hover:bg-neutral-700"
          >
            Launch JARVIS
          </a>
        </nav>
      </header>

      <main className="relative">
        <section className="mx-auto max-w-3xl px-5 pt-16 pb-14 sm:pt-24">
          <p className="font-mono text-[11px] tracking-[0.22em] text-neutral-400">
            VOICE + CAMERA AI FOR NEW YORK CITY
          </p>

          <h1 className="mt-6 max-w-2xl text-[36px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-5xl lg:text-[56px]">
            New York is hard to read.
            <span className="mt-1 block italic text-[#2F55C9]">It shouldn't be hard to ask.</span>
          </h1>

          <div className="mt-8 max-w-xl space-y-4 text-[16px] leading-relaxed text-neutral-600 sm:text-[17px]">
            <p>
              <span className="font-medium text-neutral-800">For newcomers</span> — first time
              here, signs you can't read, a city that moves faster than Google Maps can keep up.
              Ask in your language. Get a spoken answer and a route on the map.
            </p>
            <p>
              <span className="font-medium text-neutral-800">For New Yorkers</span> — same
              street, same rush, but one voice instead of four apps. Subway, weather, fare,
              whatever's in front of your camera.
            </p>
            <p className="text-neutral-900">
              Point your phone. Talk to{" "}
              <span className="italic text-[#2F55C9]">JARVIS</span>. It sees what you see and
              answers out loud in about a second.
            </p>
          </div>

          {/* Sized to be the obvious next move — a judge should never hunt for the demo. */}
          <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <a
              href={APP_PATH}
              className="group inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-neutral-900 px-10 py-5 text-lg font-semibold text-white shadow-xl shadow-neutral-900/20 transition-all hover:bg-neutral-700 hover:shadow-2xl sm:w-auto"
            >
              Launch JARVIS
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#hud"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-5 text-lg font-medium text-neutral-700 ring-1 ring-neutral-900/15 transition-colors hover:bg-neutral-50 hover:text-neutral-900 sm:w-auto"
            >
              Try the demo
              <PlayCircle className="h-5 w-5" />
            </a>
          </div>

          <p className="mt-5 text-[13px] text-neutral-400">
            Opens instantly in your browser — no install, no sign-up.
          </p>

          {/* The whole product in one scannable line, for anyone who reads nothing else. */}
          <div className="mt-11 flex flex-wrap gap-2.5">
            {ABILITIES.map((ability) => (
              <span
                key={ability}
                className="rounded-full bg-white/70 px-4 py-2 text-[13px] text-neutral-600 ring-1 ring-neutral-900/[0.08]"
              >
                {ability}
              </span>
            ))}
          </div>
        </section>

        <section id="hud" className="mx-auto max-w-4xl px-5 pb-24 scroll-mt-20">
          {/* A real 2x capture of the running app, held under its native width so it stays sharp. */}
          <figure className="overflow-hidden rounded-3xl bg-neutral-900 shadow-2xl shadow-neutral-900/25 ring-1 ring-neutral-900/10">
            <img
              src="/app-screenshot.jpg"
              alt="New Yorker running live: the camera view with JARVIS tracking faces on the left and the conversation log on the right"
              width={2400}
              height={1508}
              loading="eager"
              decoding="async"
              className="w-full"
            />
          </figure>
          <figcaption className="mx-auto mt-5 max-w-md text-center text-[13px] leading-relaxed text-neutral-400">
            One glass surface: the street on the left, the conversation on the right, and every
            answer spoken out loud as it lands.
          </figcaption>
        </section>

        <section className="border-t border-neutral-900/5">
          <div className="mx-auto max-w-3xl px-5 py-16 text-center">
            <p className="font-mono text-[10px] tracking-[0.28em] text-neutral-400">SPOKEN HERE</p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {LANGUAGES.map((name) => (
                <span key={name} className="text-[15px] text-neutral-600">{name}</span>
              ))}
              <span className="text-[15px] italic text-[#2F55C9]">and every other one</span>
            </div>
            <p className="mx-auto mt-8 max-w-md text-[14px] leading-relaxed text-neutral-500">
              Eight million people, more than eight hundred languages. Ask in yours and
              JARVIS answers in it — no menu, no settings, just say the word.
            </p>
          </div>
        </section>

        <section className="border-t border-neutral-900/5 bg-neutral-50/60">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="max-w-lg text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
              Four things it does
              <span className="italic text-[#2F55C9]"> without being asked twice</span>
            </h2>

            <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {CAPABILITIES.map(({ icon: Icon, title, body }) => (
                <div key={title}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white ring-1 ring-neutral-900/[0.07]">
                    <Icon className="h-[18px] w-[18px] text-[#2F55C9]" />
                  </div>
                  <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em]">{title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
          <h2 className="max-w-lg text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
            Three steps,
            <span className="italic text-[#2F55C9]"> then you stop thinking about it</span>
          </h2>

          <ol className="mt-12 grid gap-10 sm:grid-cols-3">
            {STEPS.map(({ n, title, body }) => (
              <li key={n} className="border-t border-neutral-900/10 pt-5">
                <span className="font-mono text-[11px] tracking-[0.2em] text-neutral-400">{n}</span>
                <h3 className="mt-3 text-[17px] font-semibold tracking-[-0.01em]">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="stack" className="border-y border-neutral-900/5 scroll-mt-20">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-14">
            <p className="font-mono text-[10px] tracking-[0.28em] text-neutral-400">BUILT WITH</p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {STACK.map((name) => (
                <span key={name} className="text-[14px] font-medium text-neutral-500">{name}</span>
              ))}
            </div>

            <div className="mt-6 w-full max-w-2xl border-t border-neutral-900/5 pt-7 text-center">
              <p className="font-mono text-[10px] tracking-[0.28em] text-neutral-400">TECH STACK</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {TECH.map((name) => (
                  <span key={name} className="text-[13px] text-neutral-400">{name}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden px-5 py-24 text-center">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2F55C9]/10 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <div className="mb-7 flex justify-center gap-1.5">
              {[
                ["1", "mta-red"],
                ["N", "mta-yellow"],
                ["A", "mta-blue"],
                ["7", "mta-orange"],
                ["4", "mta-green"],
              ].map(([line, tone]) => (
                <span key={line} className={`mta-bullet ${tone} h-7 w-7 text-[13px]`}>{line}</span>
              ))}
            </div>
            <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-5xl">
              Ready to walk out
              <span className="italic text-[#2F55C9]"> the door?</span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-neutral-500">
              Open it, allow the camera, and start talking. There is nothing else to set up.
            </p>
            <a
              href={APP_PATH}
              className="group mt-10 inline-flex items-center gap-2.5 rounded-full bg-neutral-900 px-12 py-5 text-lg font-semibold text-white shadow-xl shadow-neutral-900/20 transition-all hover:bg-neutral-700 hover:shadow-2xl"
            >
              Launch JARVIS
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
            <p className="mt-5 text-[13px] text-neutral-400">
              Works on your phone right now — allow the camera and start talking.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-900/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-[13px] text-neutral-400 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="mta-bullet mta-yellow h-6 w-6 text-[11px]">N</span>
            <span className="font-medium text-neutral-600">New Yorker</span>
          </div>
          <p className="flex items-center gap-2">
            <CloudSun className="h-4 w-4" />
            <Globe className="h-4 w-4" />
            Spatial AI for New York City
          </p>
        </div>
      </footer>
    </div>
  );
}
