import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah, useBilling, type HistoryRecord } from "@/lib/billing-store";
import { inRange, rangeLabel, type ReportRange } from "@/lib/report-range";

type Row = {
  name: string;
  count: number;
  rental: number;
  addon: number;
  fnb: number;
  discount: number;
  total: number;
  methods: Record<string, number>;
};

const paidTime = (h: HistoryRecord) => h.paidAt ?? h.endAt;

function methodsOf(h: HistoryRecord) {
  if (h.payments?.length) return h.payments;
  return h.payment ? [{ method: h.payment, amount: h.total }] : [];
}

/** Rekap transaksi yang diproses tiap kasir yang check-in. */
export function CashierReport({ range }: { range: ReportRange }) {
  const { history, shifts } = useBilling();

  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    const bucket = (name: string) => {
      const key = name || "Tanpa nama";
      let row = map.get(key);
      if (!row) {
        row = {
          name: key,
          count: 0,
          rental: 0,
          addon: 0,
          fnb: 0,
          discount: 0,
          total: 0,
          methods: {},
        };
        map.set(key, row);
      }
      return row;
    };

    // Kasir yang pernah check-in pada periode ini tetap muncul walau nol transaksi.
    for (const shift of shifts ?? []) {
      if (inRange(shift.openedAt, range)) bucket(shift.cashierName);
    }

    for (const h of history) {
      if (!inRange(paidTime(h), range)) continue;
      const row = bucket(h.cashierName ?? "");
      row.count += 1;
      row.rental += h.rentalTotal ?? 0;
      row.addon += h.addonTotal ?? 0;
      row.fnb += h.fnbTotal ?? 0;
      row.discount += h.discount ?? 0;
      row.total += h.total ?? 0;
      for (const p of methodsOf(h)) {
        row.methods[p.method] = (row.methods[p.method] ?? 0) + p.amount;
      }
    }

    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [history, shifts, range]);

  const grand = rows.reduce(
    (sum, r) => ({
      count: sum.count + r.count,
      rental: sum.rental + r.rental,
      addon: sum.addon + r.addon,
      fnb: sum.fnb + r.fnb,
      discount: sum.discount + r.discount,
      total: sum.total + r.total,
    }),
    { count: 0, rental: 0, addon: 0, fnb: 0, discount: 0, total: 0 },
  );

  return (
    <div className="surface-panel overflow-hidden">
      <div className="border-b border-border p-4">
        <h2 className="font-display text-lg font-bold">Laporan Transaksi per Kasir</h2>
        <p className="text-xs text-muted-foreground">{rangeLabel(range)}</p>
      </div>

      {rows.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          Belum ada kasir yang check-in atau bertransaksi pada periode ini.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kasir</TableHead>
                <TableHead className="text-right">Nota</TableHead>
                <TableHead className="text-right">Rental</TableHead>
                <TableHead className="text-right">Additional Rental</TableHead>
                <TableHead className="text-right">Kafe</TableHead>
                <TableHead className="text-right">Diskon</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Metode bayar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-semibold">{r.name}</TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                  <TableCell className="text-right">{formatRupiah(r.rental)}</TableCell>
                  <TableCell className="text-right">{formatRupiah(r.addon)}</TableCell>
                  <TableCell className="text-right">{formatRupiah(r.fnb)}</TableCell>
                  <TableCell className="text-right">{formatRupiah(r.discount)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatRupiah(r.total)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {Object.entries(r.methods).length === 0
                      ? "-"
                      : Object.entries(r.methods)
                          .map(([m, v]) => `${m}: ${formatRupiah(v)}`)
                          .join(" · ")}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-bold">Semua kasir</TableCell>
                <TableCell className="text-right font-bold">{grand.count}</TableCell>
                <TableCell className="text-right font-bold">
                  {formatRupiah(grand.rental)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatRupiah(grand.addon)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatRupiah(grand.fnb)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatRupiah(grand.discount)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatRupiah(grand.total)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
