import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SetupHeading } from "@/components/SetupTable";
import { formatRupiah, useBilling, type HistoryRecord } from "@/lib/billing-store";
import { useStoreInfo } from "@/lib/store-info";
import { inRange, rangeLabel, type ReportRange } from "@/lib/report-range";

type Row = {
  code: string;
  label: string;
  count: number;
  rental: number;
  addon: number;
  fnb: number;
  discount: number;
  total: number;
  cashiers: Set<string>;
  lastAt: number;
};

const paidTime = (h: HistoryRecord) => h.paidAt ?? h.endAt;

/** Rekap transaksi berdasarkan kode perangkat kasir yang memprosesnya. */
export function DeviceReport({ range }: { range: ReportRange }) {
  const { history } = useBilling();
  const { store } = useStoreInfo(true);

  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of store?.allowed_devices ?? []) {
      if (d.code) map.set(d.code, d.label || "");
    }
    return map;
  }, [store]);

  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    for (const h of history) {
      if (!inRange(paidTime(h), range)) continue;
      const code = h.deviceCode?.trim() || "";
      const key = code || "(tanpa kode perangkat)";
      let row = map.get(key);
      if (!row) {
        row = {
          code: key,
          label: labels.get(code) ?? "",
          count: 0,
          rental: 0,
          addon: 0,
          fnb: 0,
          discount: 0,
          total: 0,
          cashiers: new Set<string>(),
          lastAt: 0,
        };
        map.set(key, row);
      }
      row.count += 1;
      row.rental += h.rentalTotal ?? 0;
      row.addon += h.addonTotal ?? 0;
      row.fnb += h.fnbTotal ?? 0;
      row.discount += h.discount ?? 0;
      row.total += h.total ?? 0;
      if (h.cashierName) row.cashiers.add(h.cashierName);
      row.lastAt = Math.max(row.lastAt, paidTime(h));
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [history, range, labels]);

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
        <SetupHeading
          title="Laporan Transaksi per Perangkat"
          description={rangeLabel(range)}
        />
      </div>

      {rows.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          Belum ada transaksi pada periode ini.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode perangkat</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Nota</TableHead>
                <TableHead className="text-right">Rental</TableHead>
                <TableHead className="text-right">Additional Rental</TableHead>
                <TableHead className="text-right">Kafe</TableHead>
                <TableHead className="text-right">Diskon</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Kasir</TableHead>
                <TableHead>Transaksi terakhir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.code}>
                  <TableCell className="font-semibold">{r.code}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.label || (labels.size > 0 ? "Belum terdaftar" : "-")}
                  </TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                  <TableCell className="text-right">{formatRupiah(r.rental)}</TableCell>
                  <TableCell className="text-right">{formatRupiah(r.addon)}</TableCell>
                  <TableCell className="text-right">{formatRupiah(r.fnb)}</TableCell>
                  <TableCell className="text-right">{formatRupiah(r.discount)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatRupiah(r.total)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.cashiers.size ? [...r.cashiers].join(" · ") : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.lastAt
                      ? new Date(r.lastAt).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-bold">Semua perangkat</TableCell>
                <TableCell />
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
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
