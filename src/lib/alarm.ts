/**
 * Nada alarm bawaan aplikasi. Dibuat langsung oleh browser (Web Audio),
 * jadi tidak ada berkas suara yang perlu diunggah atau diunduh.
 * Selain nada bawaan, kasir bisa memakai berkas suara dari perangkat
 * (disimpan di perangkat itu sendiri, tidak dikirim ke server).
 */
export type AlarmSound =
  | "beep"
  | "bell"
  | "siren"
  | "chime"
  | "sirenKeras"
  | "klakson"
  | "darurat"
  | "custom";

export const ALARM_SOUNDS: { id: AlarmSound; label: string }[] = [
  { id: "beep", label: "Bip" },
  { id: "bell", label: "Bel" },
  { id: "siren", label: "Sirine" },
  { id: "chime", label: "Lonceng" },
  { id: "sirenKeras", label: "Sirine Keras" },
  { id: "klakson", label: "Klakson Keras" },
  { id: "darurat", label: "Darurat (paling kencang)" },
  { id: "custom", label: "Nada dari perangkat" },
];

export const ALARM_LABEL = (sound: AlarmSound) =>
  ALARM_SOUNDS.find((item) => item.id === sound)?.label ?? "Bip";

type Tone = {
  freq: number;
  start: number;
  dur: number;
  type?: OscillatorType;
  /** Nada akhir untuk efek naik/turun seperti sirine. */
  toFreq?: number;
  /** Pengeras nada ini (1 = normal). */
  boost?: number;
};

const PATTERNS: Record<Exclude<AlarmSound, "custom">, Tone[]> = {
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
  // Sirine naik turun, lebih panjang dan jauh lebih kencang.
  sirenKeras: [
    { freq: 700, toFreq: 1500, start: 0, dur: 0.7, type: "sawtooth", boost: 3.4 },
    { freq: 1500, toFreq: 700, start: 0.7, dur: 0.7, type: "sawtooth", boost: 3.4 },
    { freq: 700, toFreq: 1500, start: 1.4, dur: 0.7, type: "sawtooth", boost: 3.4 },
    { freq: 1500, toFreq: 700, start: 2.1, dur: 0.7, type: "sawtooth", boost: 3.4 },
    // Lapisan kedua supaya terdengar dari jauh.
    { freq: 1400, toFreq: 3000, start: 0, dur: 1.4, type: "square", boost: 1.6 },
    { freq: 3000, toFreq: 1400, start: 1.4, dur: 1.4, type: "square", boost: 1.6 },
  ],
  klakson: [
    { freq: 440, start: 0, dur: 0.45, type: "square", boost: 3.6 },
    { freq: 554, start: 0, dur: 0.45, type: "square", boost: 3.2 },
    { freq: 440, start: 0.6, dur: 0.45, type: "square", boost: 3.6 },
    { freq: 554, start: 0.6, dur: 0.45, type: "square", boost: 3.2 },
    { freq: 440, start: 1.2, dur: 0.8, type: "square", boost: 3.6 },
    { freq: 554, start: 1.2, dur: 0.8, type: "square", boost: 3.2 },
  ],
  darurat: [
    { freq: 2000, start: 0, dur: 0.2, type: "square", boost: 4 },
    { freq: 2600, start: 0.2, dur: 0.2, type: "square", boost: 4 },
    { freq: 2000, start: 0.4, dur: 0.2, type: "square", boost: 4 },
    { freq: 2600, start: 0.6, dur: 0.2, type: "square", boost: 4 },
    { freq: 2000, start: 0.8, dur: 0.2, type: "square", boost: 4 },
    { freq: 2600, start: 1, dur: 0.2, type: "square", boost: 4 },
    { freq: 900, toFreq: 2600, start: 1.2, dur: 0.8, type: "sawtooth", boost: 3 },
  ],
};

/* ------------------------- Nada dari perangkat ------------------------- */

export type CustomAlarm = { name: string; dataUrl: string; durationMs: number };

const CUSTOM_KEY = "rentoplay.alarm.custom";
/** Batas ukuran berkas nada dari perangkat (3 MB) supaya aman disimpan. */
export const CUSTOM_ALARM_MAX_BYTES = 3 * 1024 * 1024;

export function getCustomAlarm(): CustomAlarm | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomAlarm;
    return parsed?.dataUrl ? parsed : null;
  } catch {
    return null;
  }
}

export function clearCustomAlarm() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CUSTOM_KEY);
}

/** Simpan berkas suara dari perangkat sebagai nada alarm (hanya di perangkat ini). */
export async function saveCustomAlarm(file: File): Promise<CustomAlarm> {
  if (file.size > CUSTOM_ALARM_MAX_BYTES) {
    throw new Error("Berkas suara terlalu besar. Pilih berkas di bawah 3 MB.");
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Berkas suara tidak bisa dibaca."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
  const durationMs = await new Promise<number>((resolve) => {
    const probe = new Audio();
    probe.preload = "metadata";
    probe.onloadedmetadata = () =>
      resolve(Number.isFinite(probe.duration) ? Math.round(probe.duration * 1000) : 3000);
    probe.onerror = () => resolve(3000);
    probe.src = dataUrl;
  });
  const saved: CustomAlarm = { name: file.name, dataUrl, durationMs };
  window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(saved));
  return saved;
}

let customAudio: HTMLAudioElement | null = null;

/* ------------------------------ Pemutar ------------------------------ */

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

/** Batas kekencangan 1–10 dari pengaturan menjadi pengali suara. */
function levelGain(volume: number) {
  const level = Math.min(10, Math.max(1, Math.round(volume || 10)));
  return level / 10;
}

/**
 * Bunyikan satu putaran nada alarm.
 * Beberapa browser hanya mengeluarkan suara setelah layar pernah disentuh.
 */
export function playAlarm(sound: AlarmSound = "beep", volume = 10) {
  const level = levelGain(volume);

  if (sound === "custom") {
    const custom = getCustomAlarm();
    if (!custom) return playAlarm("sirenKeras", volume);
    if (typeof window === "undefined") return;
    if (!customAudio) customAudio = new Audio();
    customAudio.src = custom.dataUrl;
    customAudio.volume = Math.min(1, Math.max(0.05, level));
    customAudio.currentTime = 0;
    void customAudio.play().catch(() => undefined);
    return;
  }

  const audio = audioContext();
  if (!audio) return;
  const pattern = PATTERNS[sound] ?? PATTERNS.beep;
  const base = audio.currentTime + 0.02;

  // Penguat akhir supaya nada keras tetap tidak pecah berlebihan.
  const master = audio.createGain();
  master.gain.value = level;
  master.connect(audio.destination);

  for (const tone of pattern) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = tone.type ?? "square";
    const from = base + tone.start;
    const to = from + tone.dur;
    osc.frequency.setValueAtTime(tone.freq, from);
    if (tone.toFreq) osc.frequency.linearRampToValueAtTime(tone.toFreq, to);
    const peak = Math.min(0.95, 0.25 * (tone.boost ?? 1));
    gain.gain.setValueAtTime(0.0001, from);
    gain.gain.exponentialRampToValueAtTime(peak, from + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, to);
    osc.connect(gain).connect(master);
    osc.start(from);
    osc.stop(to + 0.02);
  }
}

/** Hentikan nada dari perangkat yang sedang berbunyi. */
export function stopAlarm() {
  if (customAudio) {
    customAudio.pause();
    customAudio.currentTime = 0;
  }
}

/** Panjang satu putaran nada, dipakai untuk jeda saat alarm berulang. */
export function alarmCycleMs(sound: AlarmSound = "beep") {
  if (sound === "custom") {
    const custom = getCustomAlarm();
    return Math.max(1000, custom?.durationMs ?? 3000) + 600;
  }
  const pattern = PATTERNS[sound] ?? PATTERNS.beep;
  const end = pattern.reduce((max, tone) => Math.max(max, tone.start + tone.dur), 0);
  return Math.round(end * 1000) + 600;
}
