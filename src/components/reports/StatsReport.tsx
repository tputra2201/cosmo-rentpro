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

type Row = { name: string; count: number; qty?: number; income: number };

const paidTime = (h: HistoryRecord) => h.paidAt ?? h.endAt;

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function bucketOf(map: Map<string, Row>, name: string) {
  const key = name || "-";
  let row = map.get(key);
  if (!row) {
    row = { name: key, count: 0, qty: 0, income: 0 };
    map.set(key, row);
  }
  return row;
}

const byIncome = (a: Row, b: Row) => b.income - a.income || b.count - a.count;

/** Statistik pemakaian dan penghasilan: tempat, konsol, menu, hari, dan jam. */
export function StatsReport({ range }: { range: ReportRange }) {
  const { history } = useBilling();

  const data = useMemo(() => {
    const places = new Map<string, Row>();
    const consoles = new Map<string, Row>();
    const menus = new Map<string, Row>();
    const days = new Map<string, Row>();
    const hours = new Map<string, Row>();
    let totalIncome = 0;
    let totalCount = 0;

    for (const h of history) {
      const at = paidTime(h);
      if (!inRange(at, range)) continue;
      const total = h.total ?? 0;
      totalIncome += total;
      totalCount += 1;

      const place = bucketOf(
        places,
        h.kind === "cafe" ? (h.tableName || h.stationName) : h.stationName,
      );
      place.count += 1;
      place.income += total;

      if (h.kind !== "cafe" && h.console) {
        const row = bucketOf(consoles, String(h.console));
        row.count += 1;
        row.income += (h.rentalTotal ?? 0) + (h.addonTotal ?? 0);
      }

      for (const order of h.orders ?? []) {
        const row = bucketOf(menus, order.name);
        row.count += 1;
        row.qty = (row.qty ?? 0) + order.qty;
        row.income += order.price * order.qty;
      }

      const date = new Date(at);
      const day = bucketOf(days, DAYS[date.getDay()] ?? "-");
      day.count += 1;
      day.income += total;

      const hour = bucketOf(
        hours,
        `${String(date.getHours()).padStart(2, "0")}:00`,
      );
      hour.count += 1;
      hour.income += total;
    }

    return {
      places: [...places.values()].sort(byIncome),
      consoles: [...consoles.values()].sort(byIncome),
      menus: [...menus.values()].sort((a, b) => (b.qty ?? 0) - (a.qty ?? 0) || b.income - a.income),
      days: [...days.values()].sort(byIncome),
      hours: [...hours.values()].sort(byIncome),
      totalIncome,
      totalCount,
    };
  }, [history, range]);

  const empty = data.totalCount === 0;

  return (
    <div className="space-y-4">
      <div className="surface-panel p-4">
        <h2 className="font-display text-lg font-bold">Statistik Terlaris &amp; Terramai</h2>
        <p className="text-xs text-muted-foreground">{rangeLabel(range)}</p>
        {!empty && (
          <p className="mt-2 text-sm text-muted-foreground">
            {data.totalCount} nota · {formatRupiah(data.totalIncome)}
          </p>
        )}
      </div>

      {empty ? (
        <p className="surface-panel p-6 text-sm text-muted-foreground">
          Belum ada transaksi pada periode ini.
        </p>
      ) : (
        <>
          <StatTable
            title="TV & Meja terlaris"
            unit="Nota"
            rows={data.places}
            total={data.totalIncome}
          />
          <StatTable
            title="Konsol terlaris"
            unit="Sesi"
            rows={data.consoles}
            emptyText="Belum ada sesi rental pada periode ini."
          />
          <StatTable
            title="Menu terlaris"
            unit="Nota"
            rows={data.menus}
            showQty
            emptyText="Belum ada penjualan menu pada periode ini."
          />
          <StatTable
            title="Hari paling ramai sampai paling sepi"
            unit="Nota"
            rows={data.days}
            total={data.totalIncome}
          />
          <StatTable
            title="Jam paling ramai sampai paling sepi"
            unit="Nota"
            rows={data.hours}
            total={data.totalIncome}
          />
        </>
      )}
    </div>
  );
}

function StatTable({
  title,
  unit,
  rows,
  showQty,
  total,
  emptyText,
}: {
  title: string;
  unit: string;
  rows: Row[];
  showQty?: boolean;
  total?: number;
  emptyText?: string;
}) {
  const sum = rows.reduce((s, r) => s + r.income, 0);
  const share = total ?? sum;

  return (
    <section className="surface-panel overflow-hidden">
      <div className="border-b border-border p-4">
        <h3 className="font-semibold">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          {emptyText ?? "Belum ada data pada periode ini."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-right">#</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="text-right">{unit}</TableHead>
                {showQty && <TableHead className="text-right">Porsi</TableHead>}
                <TableHead className="text-right">Penghasilan</TableHead>
                <TableHead className="text-right">Porsi kontribusi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.name}>
                  <TableCell className="text-right text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-semibold">{r.name}</TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                  {showQty && <TableCell className="text-right">{r.qty ?? 0}</TableCell>}
                  <TableCell className="text-right font-semibold">
                    {formatRupiah(r.income)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {share > 0 ? `${Math.round((r.income / share) * 100)}%` : "-"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell />
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">
                  {rows.reduce((s, r) => s + r.count, 0)}
                </TableCell>
                {showQty && (
                  <TableCell className="text-right font-bold">
                    {rows.reduce((s, r) => s + (r.qty ?? 0), 0)}
                  </TableCell>
                )}
                <TableCell className="text-right font-bold">{formatRupiah(sum)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
