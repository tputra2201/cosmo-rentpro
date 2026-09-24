import { useRef } from "react";
import { PrintReportButton } from "@/components/reports/PrintReportButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { addonAmount, formatRupiah, useBilling, type HistoryRecord } from "@/lib/billing-store";
import { inRange, rangeLabel, type ReportRange } from "@/lib/report-range";

type Row = { label: string; amount: number; qty?: number };

function bump(map: Map<string, Row>, label: string, amount: number, qty = 0) {
  const row = map.get(label) ?? { label, amount: 0, qty: 0 };
  row.amount += amount;
  row.qty = (row.qty ?? 0) + qty;
  map.set(label, row);
}

function sorted(map: Map<string, Row>) {
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export function CompanyReport({ range }: { range: ReportRange }) {
  const {
    history,
    cashEntries,
    cardEntries,
    menu,
    shifts,
  } = useBilling();

  const paidTime = (h: HistoryRecord) => h.paidAt ?? h.endAt;
  const records = history.filter((h) => inRange(paidTime(h), range));
  const cash = cashEntries.filter((e) => inRange(e.createdAt, range));
  const cards = cardEntries.filter((e) => inRange(e.createdAt, range));

  const rentalGross = records.reduce((s, h) => s + h.rentalTotal, 0);
  const addonGross = records.reduce((s, h) => s + (h.addonTotal ?? 0), 0);
  const fnbGross = records.reduce((s, h) => s + h.fnbTotal, 0);
  const discount = records.reduce((s, h) => s + (h.discount ?? 0), 0);
  const netSales = records.reduce((s, h) => s + h.total, 0);

  const payments = new Map<string, Row>();
  for (const h of records) {
    if (h.payments?.length) {
      for (const p of h.payments) bump(payments, p.method || "Cash", p.amount, 1);
    } else {
      bump(payments, h.payment || "Cash", h.total, 1);
    }
  }

  const discounts = new Map<string, Row>();
  for (const h of records) {
    if ((h.discount ?? 0) > 0) bump(discounts, h.promoName || "Potongan harga", h.discount ?? 0, 1);
  }

  const saleTypes = new Map<string, Row>();
  for (const h of records) {
    bump(saleTypes, h.kind === "cafe" ? "Kafe / Meja" : "Rental PS", h.total, 1);
  }

  const tables = new Map<string, Row>();
  for (const h of records) {
    if (h.kind === "cafe" && h.tableName) bump(tables, h.tableName, h.total, 1);
  }

  const addons = new Map<string, Row>();
  for (const h of records) {
    for (const a of h.addons ?? []) {
      const hours = Math.max(0, h.minutes) / 60;
      bump(addons, a.name, addonAmount(a, hours), a.qty);
    }
  }

  const consoles = new Map<string, Row>();
  for (const h of records) {
    if (h.rentalTotal > 0) bump(consoles, h.console || "Rental", h.rentalTotal, 1);
  }

  const categories = new Map<string, Row>();
  const items = new Map<string, Row>();
  for (const h of records) {
    for (const o of h.orders ?? []) {
      const item =
        menu.find((m) => m.id === o.menuId) ??
        menu.find((m) => o.id.startsWith(`${m.id}-`)) ??
        menu.find((m) => m.name === o.name);
      bump(categories, item?.category || "Lainnya", o.price * o.qty, o.qty);
      bump(items, o.name, o.price * o.qty, o.qty);
    }
    if (h.rentalTotal > 0) {
      bump(categories, "Rental", h.rentalTotal, 1);
      bump(items, `Rental ${h.console}`, h.rentalTotal, 1);
    }
    for (const a of h.addons ?? []) {
      const amount = addonAmount(a, Math.max(0, h.minutes) / 60);
      bump(categories, "Additional Rental", amount, a.qty);
      bump(items, a.name, amount, a.qty);
    }
  }

  const cashSum = (pick: (e: (typeof cash)[number]) => boolean) =>
    cash.filter(pick).reduce((s, e) => s + e.amount, 0);
  const otherIncome = cashSum((e) => e.direction === "in" && !e.payout);
  const expense = cashSum((e) => e.direction === "out" && !e.payout);
  const payoutIn = cashSum((e) => e.direction === "in" && e.payout);
  const payoutOut = cashSum((e) => e.direction === "out" && e.payout);

  const expenseRows = new Map<string, Row>();
  for (const e of cash) {
    if (e.direction === "out" && !e.payout) bump(expenseRows, e.categoryName, e.amount, 1);
  }
  const incomeRows = new Map<string, Row>();
  for (const e of cash) {
    if (e.direction === "in" && !e.payout) bump(incomeRows, e.categoryName, e.amount, 1);
  }

  // Uang kas awal periode: start cash shift pertama yang check-in pada periode ini.
  // Nilai ini tidak dijumlahkan bila ada beberapa shift, karena uang tunai di laci
  // berpindah utuh dari shift sebelumnya ke shift berikutnya.
  const shiftInRange = shifts
    .filter((s) => inRange(s.openedAt, range))
    .sort((a, b) => a.openedAt - b.openedAt);
  const startCash = shiftInRange[0]?.startCash ?? 0;

  const cashPayments = payments.get("Cash")?.amount ?? 0;
  const cashIn = cash
    .filter((e) => e.direction === "in" && e.payment === "Cash")
    .reduce((s, e) => s + e.amount, 0);
  const cashOut = cash
    .filter((e) => e.direction === "out" && e.payment === "Cash")
    .reduce((s, e) => s + e.amount, 0);

  const cardSales = cards
    .filter((e) => e.type === "purchase")
    .reduce((s, e) => s + Math.abs(e.amount), 0);
  const cardTopup = cards.filter((e) => e.type === "topup").reduce((s, e) => s + Math.abs(e.amount), 0);

  const printRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6" ref={printRef}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-accent text-xl font-extrabold tracking-tight">Company Report</h2>
          <p className="text-sm text-muted-foreground">Periode {rangeLabel(range)}</p>
        </div>
        <PrintReportButton
          targetRef={printRef}
          title={`Company Report — ${rangeLabel(range)}`}
        />
      </div>

      <Section title="Penjualan">
        <Line label="Rental" value={formatRupiah(rentalGross)} />
        <Line label="Additional Rental" value={formatRupiah(addonGross)} />
        <Line label="Makanan &amp; minuman" value={formatRupiah(fnbGross)} />
        <Line
          label="Penjualan kotor"
          value={formatRupiah(rentalGross + addonGross + fnbGross)}
        />
        <Line label="Potongan harga" value={`- ${formatRupiah(discount)}`} />
        <Line label="Penjualan bersih" value={formatRupiah(netSales)} strong />
        <Line label="Jumlah nota" value={String(records.length)} />
        <Line label="Penjualan Playing Card" value={formatRupiah(cardSales)} />
        <Line label="Top-up Playing Card (deposit)" value={formatRupiah(cardTopup)} />
      </Section>

      <Section title="Pembayaran">
        <Rows rows={sorted(payments)} countLabel="Nota" />
      </Section>

      <Section title="Potongan harga">
        <Rows rows={sorted(discounts)} countLabel="Nota" />
      </Section>

      <Section title="Jenis penjualan">
        <Rows rows={sorted(saleTypes)} countLabel="Nota" />
      </Section>

      {tables.size > 0 && (
        <Section title="Penjualan per meja">
          <Rows rows={sorted(tables)} countLabel="Nota" />
        </Section>
      )}

      {addons.size > 0 && (
        <Section title="Additional Rental">
          <Rows rows={sorted(addons)} countLabel="Jumlah" />
        </Section>
      )}

      <Section title="Rental per konsol">
        <Rows rows={sorted(consoles)} countLabel="Sesi" />
      </Section>

      <Section title="Kelompok barang">
        <Rows rows={sorted(categories)} countLabel="Jumlah" />
      </Section>

      <Section title="Rincian barang terjual">
        <Rows rows={sorted(items)} countLabel="Jumlah" />
      </Section>

      <Section title="Pendapatan lain">
        <Rows rows={sorted(incomeRows)} countLabel="Catatan" />
        <Line label="Total pendapatan lain" value={formatRupiah(otherIncome)} strong />
      </Section>

      <Section title="Pengeluaran">
        <Rows rows={sorted(expenseRows)} countLabel="Catatan" />
        <Line label="Total pengeluaran" value={formatRupiah(expense)} strong />
      </Section>

      <Section title="Tutup kas (uang tunai)">
        <Line label="Penjualan tunai" value={formatRupiah(cashPayments)} />
        <Line label="Kas masuk lain" value={formatRupiah(cashIn)} />
        <Line label="Kas keluar" value={`- ${formatRupiah(cashOut)}`} />
        <Line
          label="Perkiraan uang tunai di kasir"
          value={formatRupiah(cashPayments + cashIn - cashOut)}
          strong
        />
        {(payoutIn > 0 || payoutOut > 0) && (
          <Line
            label="Perpindahan kas (bukan pendapatan)"
            value={`masuk ${formatRupiah(payoutIn)} · keluar ${formatRupiah(payoutOut)}`}
          />
        )}
      </Section>

      <Section title="Ringkasan akhir">
        <Line label="Penjualan bersih" value={formatRupiah(netSales)} />
        <Line label="Pendapatan lain" value={formatRupiah(otherIncome)} />
        <Line label="Pengeluaran" value={`- ${formatRupiah(expense)}`} />
        <Line
          label="Sisa bersih periode ini"
          value={formatRupiah(netSales + otherIncome - expense)}
          strong
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface-panel p-4 sm:p-6">
      <h3 className="text-accent mb-3 text-sm font-bold uppercase tracking-wider">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={
        strong
          ? "flex items-center justify-between gap-4 border-t pt-2 font-semibold"
          : "flex items-center justify-between gap-4 text-sm"
      }
    >
      <span>{label}</span>
      <span className={strong ? "text-accent" : "font-medium"}>{value}</span>
    </div>
  );
}

function Rows({ rows, countLabel }: { rows: Row[]; countLabel: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Tidak ada data pada periode ini.</p>;
  }
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead className="text-right">{countLabel}</TableHead>
            <TableHead className="text-right">Jumlah</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.label}>
              <TableCell>{r.label}</TableCell>
              <TableCell className="text-right">{r.qty ?? 0}</TableCell>
              <TableCell className="text-right">{formatRupiah(r.amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="font-semibold">Total</TableCell>
            <TableCell />
            <TableCell className="text-right font-semibold">{formatRupiah(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
