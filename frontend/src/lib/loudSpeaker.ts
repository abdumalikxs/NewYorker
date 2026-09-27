// On iPad the front camera puts Safari into a phone-call route, so Jarvis
// comes out of the small speaker next to that camera. "playback" is the loud
// speaker, but writing it once is not enough: after the camera opens, WebKit
// keeps the small speaker until the session type is changed again. setSinkId
// then pins the element to the built-in speaker instead of the receiver.

type AudioSession = { type: string };
type SinkAudio = HTMLAudioElement & { setSinkId?: (sinkId: string) => Promise<void> };

function session(): AudioSession | null {
  const nav = navigator as Navigator & { audioSession?: AudioSession };
  return nav.audioSession ?? null;
}

function isTabletSafari(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
    Boolean(nav.userAgentData?.mobile)
  );
}

export function forceLoudSpeaker() {
  const audioSession = session();
  if (!audioSession || audioSession.type === "playback") return;
  try {
    audioSession.type = "playback";
  } catch {
    // A capture start can reject the switch for one turn.
  }
}

// One flip through "auto" before a clip starts. Doing this after play() begins
// makes Safari drop the voice, so it is never called while he is talking.
export function primeLoudSpeaker() {
  const audioSession = session();
  if (!audioSession) return;
  try {
    if (audioSession.type === "playback") audioSession.type = "auto";
    audioSession.type = "playback";
  } catch {
    forceLoudSpeaker();
  }
}

let loudSinkId: string | null = null;

function speakerScore(label: string): number {
  const name = label.toLowerCase();
  if (/receiver|earpiece|handset/.test(name)) return -1;
  if (/speaker/.test(name)) return 3;
  if (name.startsWith("default")) return 2;
  return 1;
}

export async function resolveLoudSink() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter((device) => device.kind === "audiooutput" && device.deviceId);
    if (!outputs.length) return;
    outputs.sort((a, b) => speakerScore(b.label) - speakerScore(a.label));
    const best = outputs[0];
    if (speakerScore(best.label) < 0) return;
    loudSinkId = best.deviceId;
  } catch {
    // Labels stay hidden until the camera or mic permission exists.
  }
}

export async function attachLoudSpeaker(audio: HTMLAudioElement) {
  primeLoudSpeaker();
  if (!loudSinkId) await resolveLoudSink();
  primeLoudSpeaker();

  const sinkAudio = audio as SinkAudio;
  if (!sinkAudio.setSinkId) return;
  try {
    // An empty id clears the receiver preference the front camera just set.
    // A real speaker id, when Safari lists one, pins the loud speakers.
    await sinkAudio.setSinkId(loudSinkId ?? "");
  } catch {
    loudSinkId = null;
  }
}

let keeper: number | null = null;

export function keepLoudSpeaker() {
  forceLoudSpeaker();
  void resolveLoudSink();
  if (keeper !== null) return;
  // Only repair a session the camera has flipped away from playback.
  // Cycling on this timer would cut Jarvis off mid-sentence.
  keeper = window.setInterval(() => {
    const audioSession = session();
    if (!audioSession || audioSession.type === "playback") return;
    try {
      audioSession.type = "playback";
    } catch {
      // Retried on the next tick and before the next reply.
    }
  }, 400);

  if (!isTabletSafari()) return;
  const arm = () => {
    void resolveLoudSink();
  };
  window.addEventListener("pointerdown", arm, { passive: true });
  window.addEventListener("touchend", arm, { passive: true });
}
