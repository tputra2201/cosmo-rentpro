export type RangeMode = "day" | "month" | "year";

export type ReportRange = {
  mode: RangeMode;
  from: string; // "yyyy-mm-dd" | "yyyy-mm" | "yyyy"
  to: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function todayValue(mode: RangeMode, at = new Date()) {
  const y = at.getFullYear();
  if (mode === "year") return String(y);
  if (mode === "month") return `${y}-${pad(at.getMonth() + 1)}`;
  return `${y}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

export function defaultRange(mode: RangeMode = "day"): ReportRange {
  const value = todayValue(mode);
  return { mode, from: value, to: value };
}

/** Awal dan akhir (eksklusif) rentang waktu dalam milidetik lokal. */
export function rangeBounds(range: ReportRange): { start: number; end: number } {
  const parse = (value: string) => value.split("-").map((part) => Number(part));
  const [fy = 1970, fm = 1, fd = 1] = parse(range.from);
  const [ty = 1970, tm = 1, td = 1] = parse(range.to);

  const start = new Date(fy, range.mode === "year" ? 0 : fm - 1, range.mode === "day" ? fd : 1);
  let end: Date;
  if (range.mode === "year") end = new Date(ty + 1, 0, 1);
  else if (range.mode === "month") end = new Date(ty, tm, 1);
  else end = new Date(ty, tm - 1, td + 1);

  const a = start.getTime();
  const b = end.getTime();
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

export function inRange(at: number, range: ReportRange) {
  const { start, end } = rangeBounds(range);
  return at >= start && at < end;
}

export function rangeLabel(range: ReportRange) {
  const { start, end } = rangeBounds(range);
  const last = new Date(end - 1);
  const fmt = (d: Date) =>
    range.mode === "year"
      ? String(d.getFullYear())
      : range.mode === "month"
        ? d.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
        : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const a = fmt(new Date(start));
  const b = fmt(last);
  return a === b ? a : `${a} – ${b}`;
}
