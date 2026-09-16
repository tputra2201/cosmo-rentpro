export type RangeMode = "day" | "month" | "year";

/** Jam operasional store: buka jam 10 pagi, tutup jam 2 dini hari. */
export type OperatingHours = { openHour: number; closeHour: number };

export const DEFAULT_OPERATING_HOURS: OperatingHours = { openHour: 10, closeHour: 2 };

export type ReportRange = {
  mode: RangeMode;
  from: string; // "yyyy-mm-dd" | "yyyy-mm" | "yyyy"
  to: string;
  /** Jam operasional yang dipakai untuk menggeser batas hari usaha. */
  hours?: OperatingHours;
  /**
   * Batas akhir sebenarnya, dipakai bila hari usaha itu sudah ditutup lewat
   * End of Day (memakai waktu penutupan) atau masih berjalan (memakai sekarang).
   */
  endOverride?: number;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function normalizeHours(hours?: OperatingHours | null): OperatingHours {
  const openHour = Math.min(23, Math.max(0, Math.round(hours?.openHour ?? DEFAULT_OPERATING_HOURS.openHour)));
  const closeHour = Math.min(23, Math.max(0, Math.round(hours?.closeHour ?? DEFAULT_OPERATING_HOURS.closeHour)));
  return { openHour, closeHour };
}

export function todayValue(mode: RangeMode, at = new Date()) {
  const y = at.getFullYear();
  if (mode === "year") return String(y);
  if (mode === "month") return `${y}-${pad(at.getMonth() + 1)}`;
  return `${y}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

/**
 * Tanggal hari usaha untuk satu waktu: transaksi sebelum jam buka
 * (misal jam 01:30) masih masuk hari usaha sebelumnya.
 */
export function businessDate(at: number | Date, hours?: OperatingHours): Date {
  const { openHour } = normalizeHours(hours);
  const d = new Date(at);
  if (d.getHours() < openHour) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Kunci "yyyy-mm-dd" berdasarkan hari usaha. */
export function businessDateKey(at: number | Date, hours?: OperatingHours) {
  return todayValue("day", businessDate(at, hours));
}

export function defaultRange(
  mode: RangeMode = "day",
  hours?: OperatingHours,
): ReportRange {
  const value = todayValue(mode, businessDate(Date.now(), hours));
  return { mode, from: value, to: value, hours: normalizeHours(hours) };
}

/** Awal dan akhir (eksklusif) rentang waktu dalam milidetik lokal. */
export function rangeBounds(range: ReportRange): { start: number; end: number } {
  const { openHour, closeHour } = normalizeHours(range.hours);
  const parse = (value: string) => value.split("-").map((part) => Number(part));
  const [fy = 1970, fm = 1, fd = 1] = parse(range.from);
  const [ty = 1970, tm = 1, td = 1] = parse(range.to);

  const start = new Date(
    fy,
    range.mode === "year" ? 0 : fm - 1,
    range.mode === "day" ? fd : 1,
    openHour,
  );

  // Batas akhir digeser mengikuti jam tutup: hari usaha berakhir pada jam
  // tutup keesokan harinya (kecuali jam tutup lebih besar dari jam buka).
  const overnight = closeHour <= openHour;
  let end: Date;
  if (range.mode === "year") end = new Date(ty + 1, 0, overnight ? 1 : 0, closeHour);
  else if (range.mode === "month") end = new Date(ty, tm, overnight ? 1 : 0, closeHour);
  else end = new Date(ty, tm - 1, overnight ? td + 1 : td, closeHour);

  const a = start.getTime();
  let b = end.getTime();
  if (range.endOverride !== undefined) b = range.endOverride;

  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

export function inRange(at: number, range: ReportRange) {
  const { start, end } = rangeBounds(range);
  return at >= start && at < end;
}

export function rangeLabel(range: ReportRange) {
  const { start, end } = rangeBounds(range);
  const startDate = new Date(start);
  const endDate = new Date(end);
  const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const day = (d: Date) =>
    d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  if (range.mode === "day") {
    const sameDay = startDate.toDateString() === endDate.toDateString();
    return sameDay
      ? `${day(startDate)} · ${clock(startDate)} – ${clock(endDate)}`
      : `${day(startDate)} ${clock(startDate)} – ${day(endDate)} ${clock(endDate)}`;
  }

  const fmt = (d: Date) =>
    range.mode === "year"
      ? String(d.getFullYear())
      : d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const a = fmt(businessDate(startDate.getTime(), range.hours));
  const b = fmt(businessDate(end - 1, range.hours));
  const period = a === b ? a : `${a} – ${b}`;
  return `${period} · ${day(startDate)} ${clock(startDate)} – ${day(endDate)} ${clock(endDate)}`;
}
