/**
 * Pengaturan & pencetakan dokumen (struk, invoice, label dapur/bar, laporan).
 *
 * Pencetakan memakai dialog cetak bawaan sistem: dokumen dirakit menjadi HTML
 * dengan ukuran kertas yang tepat (40mm / 80mm / A4), lalu dikirim ke printer
 * yang dipilih pengguna di dialog. Cara ini bekerja di semua perangkat,
 * termasuk printer thermal Bluetooth yang sudah dipasang di sistem operasi
 * maupun printer inkjet A4 lewat USB.
 */

export type PrinterRole = "receipt" | "invoice" | "kitchen" | "bar" | "report";
export type PaperSize = "40mm" | "80mm" | "a4";

export type PrinterConfig = {
  id: string;
  name: string;
  role: PrinterRole;
  paper: PaperSize;
  /** Ukuran huruf (pt). */
  fontSizePt: number;
  /** Huruf tebal. */
  bold: boolean;
  /** Margin kertas (mm). */
  marginMm: number;
  /** Jumlah salinan setiap kali mencetak. */
  copies: number;
  active: boolean;
  note?: string;
  sort?: number;
};

/** Layout dokumen struk / invoice yang bisa diatur pengguna. */
export type DocLayout = {
  headerText: string;
  footerText: string;
  marginMm: number;
  fontSizePt: number;
  bold: boolean;
  showStoreInfo: boolean;
  showCustomer: boolean;
  showItems: boolean;
  showPayment: boolean;
};

export const PRINTER_ROLE_LABEL: Record<PrinterRole, string> = {
  receipt: "Receipt (struk)",
  invoice: "Invoice",
  kitchen: "Kitchen Printer (label makanan)",
  bar: "Bar Printer (label minuman)",
  report: "Report Printer (laporan)",
};

export const PAPER_LABEL: Record<PaperSize, string> = {
  "40mm": "Thermal 40 mm",
  "80mm": "Thermal 80 mm",
  a4: "A4 (inkjet / USB)",
};

export const PAPER_OPTIONS: PaperSize[] = ["40mm", "80mm", "a4"];
export const PRINTER_ROLES: PrinterRole[] = [
  "receipt",
  "invoice",
  "kitchen",
  "bar",
  "report",
];

export const defaultReceiptLayout: DocLayout = {
  headerText: "",
  footerText: "Terima kasih atas kunjungan Anda",
  marginMm: 3,
  fontSizePt: 9,
  bold: false,
  showStoreInfo: true,
  showCustomer: true,
  showItems: true,
  showPayment: true,
};

export const defaultInvoiceLayout: DocLayout = {
  ...defaultReceiptLayout,
  footerText: "Invoice ini sah tanpa tanda tangan.",
  fontSizePt: 10,
};

export const defaultPrinters: PrinterConfig[] = [
  {
    id: "prt-receipt",
    name: "Printer Struk",
    role: "receipt",
    paper: "80mm",
    fontSizePt: 9,
    bold: false,
    marginMm: 3,
    copies: 1,
    active: true,
    sort: 1,
  },
  {
    id: "prt-invoice",
    name: "Printer Invoice",
    role: "invoice",
    paper: "80mm",
    fontSizePt: 10,
    bold: false,
    marginMm: 4,
    copies: 1,
    active: true,
    sort: 2,
  },
  {
    id: "prt-kitchen",
    name: "Kitchen Printer",
    role: "kitchen",
    paper: "40mm",
    fontSizePt: 9,
    bold: true,
    marginMm: 2,
    copies: 1,
    active: true,
    sort: 3,
  },
  {
    id: "prt-bar",
    name: "Bar Printer",
    role: "bar",
    paper: "40mm",
    fontSizePt: 9,
    bold: true,
    marginMm: 2,
    copies: 1,
    active: true,
    sort: 4,
  },
  {
    id: "prt-report",
    name: "Report Printer",
    role: "report",
    paper: "a4",
    fontSizePt: 10,
    bold: false,
    marginMm: 10,
    copies: 1,
    active: true,
    sort: 5,
  },
];

export function printerFor(
  printers: PrinterConfig[],
  role: PrinterRole,
  id?: string,
): PrinterConfig | undefined {
  if (id) {
    const found = printers.find((p) => p.id === id && p.active);
    if (found) return found;
  }
  return printers.find((p) => p.role === role && p.active);
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const PAPER_WIDTH_MM: Record<PaperSize, number | null> = {
  "40mm": 40,
  "80mm": 80,
  a4: null,
};

/** CSS dasar untuk satu jenis kertas. */
export function paperCss(printer: PrinterConfig) {
  const width = PAPER_WIDTH_MM[printer.paper];
  const margin = Math.max(0, printer.marginMm);
  const page =
    width === null
      ? `@page { size: A4; margin: ${margin}mm; }`
      : `@page { size: ${width}mm auto; margin: ${margin}mm; }`;
  const bodyWidth = width === null ? "auto" : `${width - margin * 2}mm`;
  return `
    ${page}
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: ${bodyWidth};
      font-family: "Plus Jakarta Sans", "Helvetica Neue", Arial, sans-serif;
      font-size: ${printer.fontSizePt}pt;
      font-weight: ${printer.bold ? 700 : 400};
      color: #000;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 700; }
    .big { font-size: ${printer.fontSizePt + 3}pt; }
    .muted { font-size: ${Math.max(6, printer.fontSizePt - 1)}pt; }
    .sep { border-top: 1px dashed #000; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; gap: 6px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 2px 3px; text-align: left; vertical-align: top; }
    .page-break { page-break-after: always; }
    .page-break:last-child { page-break-after: auto; }
  `;
}

/** Kirim satu dokumen HTML ke dialog cetak sistem. */
export function printHtml(title: string, css: string, body: string) {
  if (typeof document === "undefined") return;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
      title,
    )}</title><style>${css}</style></head><body>${body}</body></html>`,
  );
  doc.close();

  const run = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      window.setTimeout(() => frame.remove(), 2000);
    }
  };
  // Beri waktu browser merender isi dokumen sebelum dialog cetak dibuka.
  window.setTimeout(run, 250);
}

/** Ulangi isi dokumen sebanyak jumlah salinan pada pengaturan printer. */
export function withCopies(printer: PrinterConfig, body: string) {
  const copies = Math.min(5, Math.max(1, Math.round(printer.copies || 1)));
  if (copies === 1) return body;
  return Array.from({ length: copies }, () => `<div class="page-break">${body}</div>`).join("");
}
