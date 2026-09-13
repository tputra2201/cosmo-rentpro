/** Perakit dokumen cetak: struk, invoice, label dapur/bar, dan laporan. */

import { formatRupiah, type HistoryRecord, type OrderItem } from "./billing-store";
import {
  CHARS_PER_LINE,
  escapeHtml,
  paperCss,
  printHtml,
  printMode,
  printViaRawBt,
  textCenter,
  textRow,
  textSep,
  textWithCopies,
  withCopies,
  type DocLayout,
  type PrinterConfig,
} from "./printing";

export type PrintStore = {
  store_name?: string;
  address?: string;
  city?: string;
  phone?: string;
  store_code?: string;
} | null;

const time = (ms?: number) =>
  ms ? new Date(ms).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "-";

function layoutCss(layout: DocLayout) {
  return `
    body { font-size: ${layout.fontSizePt}pt; font-weight: ${layout.bold ? 700 : 400};
      padding: ${Math.max(0, layout.marginMm)}mm 0; }
  `;
}

function storeBlock(store: PrintStore, layout: DocLayout) {
  if (!layout.showStoreInfo) return "";
  const lines = [store?.address, store?.city, store?.phone ? `Telp ${store.phone}` : ""].filter(
    Boolean,
  );
  return `
    <div class="center bold big">${escapeHtml(store?.store_name || "Billing Rental PS")}</div>
    ${lines.map((l) => `<div class="center muted">${escapeHtml(l)}</div>`).join("")}
  `;
}

function itemRows(record: HistoryRecord) {
  const rows: string[] = [];
  if (record.rentalTotal > 0) {
    rows.push(
      `<tr><td>Rental ${escapeHtml(record.stationName)} (${record.minutes} mnt)</td><td class="right">${formatRupiah(
        record.rentalTotal,
      )}</td></tr>`,
    );
  }
  for (const o of record.orders ?? []) {
    rows.push(
      `<tr><td>${escapeHtml(o.name)} × ${o.qty}</td><td class="right">${formatRupiah(
        o.price * o.qty,
      )}</td></tr>`,
    );
  }
  return rows.join("");
}

function paymentBlock(record: HistoryRecord) {
  const splits = record.payments?.length
    ? record.payments.map((p) => `${p.method}: ${formatRupiah(p.amount)}`)
    : [`${record.payment ?? "Cash"}: ${formatRupiah(record.amountPaid ?? record.total)}`];
  return `
    ${splits.map((s) => `<div class="row"><span>${escapeHtml(s)}</span></div>`).join("")}
    ${
      record.change
        ? `<div class="row"><span>Kembali</span><span>${formatRupiah(record.change)}</span></div>`
        : ""
    }
  `;
}

export function receiptBody(opts: {
  record: HistoryRecord;
  store: PrintStore;
  layout: DocLayout;
  kind: "receipt" | "invoice";
  cashier?: string;
}) {
  const { record, store, layout, kind, cashier } = opts;
  const title = kind === "invoice" ? "INVOICE" : "STRUK PEMBAYARAN";
  return `
    ${layout.headerText ? `<div class="center bold">${escapeHtml(layout.headerText)}</div>` : ""}
    ${storeBlock(store, layout)}
    <div class="sep"></div>
    <div class="center bold">${title}</div>
    <div class="muted">No: ${escapeHtml(record.id)}</div>
    <div class="muted">Waktu: ${time(record.paidAt ?? record.endAt)}</div>
    ${cashier ? `<div class="muted">Kasir: ${escapeHtml(cashier)}</div>` : ""}
    ${
      layout.showCustomer
        ? `<div class="muted">Pelanggan: ${escapeHtml(record.customerName || "Umum")}</div>
           ${record.tableName ? `<div class="muted">Meja: ${escapeHtml(record.tableName)}</div>` : ""}`
        : ""
    }
    <div class="sep"></div>
    ${layout.showItems ? `<table>${itemRows(record)}</table><div class="sep"></div>` : ""}
    <div class="row"><span>Subtotal</span><span>${formatRupiah(
      record.rentalTotal + record.fnbTotal,
    )}</span></div>
    ${
      record.discount
        ? `<div class="row"><span>Potongan ${escapeHtml(
            record.promoName || "",
          )}</span><span>- ${formatRupiah(record.discount)}</span></div>`
        : ""
    }
    <div class="row bold big"><span>TOTAL</span><span>${formatRupiah(record.total)}</span></div>
    ${layout.showPayment ? `<div class="sep"></div>${paymentBlock(record)}` : ""}
    <div class="sep"></div>
    ${layout.footerText ? `<div class="center muted">${escapeHtml(layout.footerText)}</div>` : ""}
  `;
}

export function printReceipt(opts: {
  record: HistoryRecord;
  store: PrintStore;
  printer: PrinterConfig;
  layout: DocLayout;
  kind: "receipt" | "invoice";
  cashier?: string;
}) {
  const body = receiptBody(opts);
  printHtml(
    opts.kind === "invoice" ? "Invoice" : "Struk",
    paperCss(opts.printer) + layoutCss(opts.layout),
    withCopies(opts.printer, body),
  );
}

export type LabelItem = { name: string; qty: number; note?: string };

/** Satu label per item (kertas label thermal dapur / bar). */
export function printLabels(opts: {
  printer: PrinterConfig;
  items: LabelItem[];
  heading: string;
  source: string;
  customerName?: string;
  note?: string;
  at?: number;
}) {
  const { printer, items, heading, source, customerName, note } = opts;
  const stamp = time(opts.at ?? Date.now());
  const labels = items
    .map(
      (item) => `
        <div class="page-break">
          <div class="center bold">${escapeHtml(heading)}</div>
          <div class="sep"></div>
          <div class="bold big">${escapeHtml(item.name)}</div>
          <div class="bold big">× ${item.qty}</div>
          ${item.note ? `<div class="muted">${escapeHtml(item.note)}</div>` : ""}
          <div class="sep"></div>
          <div class="muted">${escapeHtml(source)}</div>
          ${customerName ? `<div class="muted">${escapeHtml(customerName)}</div>` : ""}
          ${note ? `<div class="muted">${escapeHtml(note)}</div>` : ""}
          <div class="muted">${escapeHtml(stamp)}</div>
        </div>
      `,
    )
    .join("");
  printHtml(heading, paperCss(printer), withCopies(printer, labels));
}

/** Cetak isi laporan yang sedang tampil di layar. */
export function printReport(printer: PrinterConfig, title: string, innerHtml: string) {
  const css = `
    ${paperCss(printer)}
    h1, h2, h3 { font-size: ${printer.fontSizePt + 2}pt; margin: 6px 0 3px; }
    table { margin-bottom: 6px; }
    th, td { border-bottom: 1px solid #ddd; }
    button, [role="tablist"], svg { display: none !important; }
    section { break-inside: avoid; margin-bottom: 8px; }
  `;
  printHtml(
    title,
    css,
    `<div class="center bold big">${escapeHtml(title)}</div><div>${innerHtml}</div>`,
  );
}

/** Kelompokkan order menjadi item label sesuai pengaturan cetak tiap menu. */
export function labelItemsFor(
  orders: OrderItem[],
  menu: { id: string; name: string; printEnabled?: boolean; printerId?: string }[],
  printerId: string,
): LabelItem[] {
  const out: LabelItem[] = [];
  for (const o of orders) {
    const item =
      menu.find((m) => m.id === o.menuId) ??
      menu.find((m) => o.id.startsWith(`${m.id}-`)) ??
      menu.find((m) => m.name === o.name);
    if (!item) continue;
    if (item.printEnabled === false) continue;
    if (item.printerId !== printerId) continue;
    out.push({ name: o.name, qty: o.qty });
  }
  return out;
}
