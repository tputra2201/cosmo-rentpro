/**
 * Nada alarm bawaan aplikasi. Dibuat langsung oleh browser (Web Audio),
 * jadi tidak ada berkas suara yang perlu diunggah atau diunduh.
 */
export type AlarmSound = "beep" | "bell" | "siren" | "chime";

export const ALARM_SOUNDS: { id: AlarmSound; label: string }[] = [
  { id: "beep", label: "Bip" },
  { id: "bell", label: "Bel" },
  { id: "siren", label: "Sirine" },
  { id: "chime", label: "Lonceng" },
];

export const ALARM_LABEL = (sound: AlarmSound) =>
  ALARM_SOUNDS.find((item) => item.id === sound)?.label ?? "Bip";

type Tone = { freq: number; start: number; dur: number; type?: OscillatorType };

const PATTERNS: Record<AlarmSound, Tone[]> = {
  beep: [
    { freq: 880, start: 0, dur: 0.16 },
    { freq: 880, start: 0.24, dur: 0.16 },
    { freq: 880, start: 0.48, dur: 0.16 },
  ],
  bell: [
    { freq: 1320, start: 0, dur: 0.5, type: "triangle" },
    { freq: 990, start: 0.12, dur: 0.6, type: "triangle" },
  ],
  siren: [
    { freq: 620, start: 0, dur: 0.3, type: "sawtooth" },
    { freq: 940, start: 0.3, dur: 0.3, type: "sawtooth" },
    { freq: 620, start: 0.6, dur: 0.3, type: "sawtooth" },
    { freq: 940, start: 0.9, dur: 0.3, type: "sawtooth" },
  ],
  chime: [
    { freq: 1046, start: 0, dur: 0.35, type: "sine" },
    { freq: 1318, start: 0.2, dur: 0.35, type: "sine" },
    { freq: 1568, start: 0.4, dur: 0.6, type: "sine" },
  ],
};

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/**
 * Bunyikan satu putaran nada alarm.
 * Beberapa browser hanya mengeluarkan suara setelah layar pernah disentuh.
 */
export function playAlarm(sound: AlarmSound = "beep") {
  const audio = audioContext();
  if (!audio) return;
  const pattern = PATTERNS[sound] ?? PATTERNS.beep;
  const base = audio.currentTime + 0.02;
  for (const tone of pattern) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = tone.type ?? "square";
    osc.frequency.value = tone.freq;
    const from = base + tone.start;
    const to = from + tone.dur;
    gain.gain.setValueAtTime(0.0001, from);
    gain.gain.exponentialRampToValueAtTime(0.25, from + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, to);
    osc.connect(gain).connect(audio.destination);
    osc.start(from);
    osc.stop(to + 0.02);
  }
}

/** Panjang satu putaran nada, dipakai untuk jeda saat alarm berulang. */
export function alarmCycleMs(sound: AlarmSound = "beep") {
  const pattern = PATTERNS[sound] ?? PATTERNS.beep;
  const end = pattern.reduce((max, tone) => Math.max(max, tone.start + tone.dur), 0);
  return Math.round(end * 1000) + 600;
}
