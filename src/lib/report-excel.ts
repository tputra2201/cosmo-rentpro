/**
 * Ekspor isi laporan yang sedang tampil ke berkas Excel (.xlsx).
 * Tiap tabel di laporan menjadi satu sheet, dengan lebar kolom otomatis
 * dan pengaturan halaman siap cetak.
 */

type Cell = string | number;

const MAX_SHEET_NAME = 31;

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

/** Ubah teks angka Indonesia ("Rp 1.500", "12,5%") menjadi angka bila mungkin. */
function toCell(text: string): Cell {
  const raw = cleanText(text);
  if (!raw) return "";
  const numeric = raw
    .replace(/^-?\s*Rp\.?\s*/i, (m) => (m.trim().startsWith("-") ? "-" : ""))
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".")
    .replace(/\s/g, "");
  if (/^-?\d+(\.\d+)?$/.test(numeric) && /\d/.test(raw) && !/[a-zA-Z%:/]/.test(raw)) {
    return Number(numeric);
  }
  return raw;
}

function tableToRows(table: HTMLTableElement): Cell[][] {
  const rows: Cell[][] = [];
  for (const tr of Array.from(table.rows)) {
    const cells = Array.from(tr.cells).map((td) => toCell(td.innerText ?? td.textContent ?? ""));
    if (cells.some((c) => c !== "")) rows.push(cells);
  }
  return rows;
}

/** Judul terdekat di atas tabel, dipakai sebagai nama sheet. */
function nearestHeading(table: HTMLElement, fallback: string) {
  let node: HTMLElement | null = table;
  while (node) {
    let prev = node.previousElementSibling as HTMLElement | null;
    while (prev) {
      const heading = prev.matches("h1,h2,h3,h4")
        ? prev
        : prev.querySelector<HTMLElement>("h1,h2,h3,h4");
      if (heading) {
        const text = cleanText(heading.innerText ?? "");
        if (text) return text;
      }
      prev = prev.previousElementSibling as HTMLElement | null;
    }
    node = node.parentElement;
    if (node?.tagName === "BODY") break;
  }
  return fallback;
}

function uniqueSheetName(base: string, used: Set<string>) {
  const safe = (base.replace(/[\\/?*[\]:]/g, " ").trim() || "Laporan").slice(
    0,
    MAX_SHEET_NAME,
  );
  let name = safe;
  let n = 2;
  while (used.has(name)) {
    const suffix = ` (${n})`;
    name = safe.slice(0, MAX_SHEET_NAME - suffix.length) + suffix;
    n += 1;
  }
  used.add(name);
  return name;
}

/** Kartu ringkasan (label + angka) yang ada di laporan, dibuat jadi sheet Ringkasan. */
function summaryRows(container: HTMLElement): Cell[][] {
  const rows: Cell[][] = [];
  const nodes = container.querySelectorAll<HTMLElement>("[data-report-stat]");
  for (const node of Array.from(nodes)) {
    const label = cleanText(node.dataset["reportStat"] ?? "");
    const value = toCell(node.innerText ?? "");
    if (label) rows.push([label, value]);
  }
  return rows;
}

export type ExcelFile = { blob: Blob; fileName: string };

export async function buildReportWorkbook(
  container: HTMLElement,
  title: string,
  periodText: string,
): Promise<ExcelFile> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  const stamp = new Date();

  const addSheet = (name: string, rows: Cell[][], headerRow: boolean) => {
    const head: Cell[][] = [[title], [periodText], [`Dicetak: ${stamp.toLocaleString("id-ID")}`], []];
    const all = [...head, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(all);
    const widthSource = rows.length > 0 ? rows : head;
    const colCount = widthSource.reduce((m, r) => Math.max(m, r.length), 1);
    ws["!cols"] = Array.from({ length: colCount }, (_, i) => ({
      wch: Math.min(
        40,
        Math.max(
          10,
          ...all.map((r) => String(r[i] ?? "").length + 2),
        ),
      ),
    }));
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, colCount - 1) } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(0, colCount - 1) } },
    ];
    if (headerRow) ws["!freeze"] = { xSplit: 0, ySplit: head.length + 1 };
    ws["!margins"] = { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 };
    XLSX.utils.book_append_sheet(wb, ws, uniqueSheetName(name, used));
  };

  const summary = summaryRows(container);
  if (summary.length > 0) addSheet("Ringkasan", [["Keterangan", "Nilai"], ...summary], true);

  const tables = Array.from(container.querySelectorAll("table")) as HTMLTableElement[];
  tables.forEach((table, i) => {
    const rows = tableToRows(table);
    if (rows.length === 0) return;
    addSheet(nearestHeading(table, `Tabel ${i + 1}`), rows, true);
  });

  if (wb.SheetNames.length === 0) addSheet("Laporan", [["Tidak ada data pada periode ini."]], false);

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const fileName = `${slug || "laporan"}-${stamp.toISOString().slice(0, 10)}.xlsx`;
  return { blob, fileName };
}

export function downloadFile({ blob, fileName }: ExcelFile) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
