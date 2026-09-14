import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { inRange, rangeLabel, type ReportRange } from "@/lib/report-range";
import { formatRupiah, shiftSummary, useBilling } from "@/lib/billing-store";

function stamp(ts?: number) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ShiftReport({ range }: { range: ReportRange }) {
  const { shifts, history, cashEntries } = useBilling();

  // Riwayat dikelompokkan berdasarkan tanggal check-in kasir, bukan tanggal close out.
  const rows = shifts
    .filter((s) => inRange(s.openedAt, range))
    .sort((a, b) => b.openedAt - a.openedAt)
    .map((shift) => {
      const summary = shiftSummary(shift, history, cashEntries);
      const actual = shift.cashActual ?? null;
      return {
        shift,
        summary,
        actual,
        balance: actual === null ? null : actual - summary.expected,
      };
    });

  const totals = rows.reduce(
    (acc, r) => ({
      sales: acc.sales + r.summary.sales,
      expenses: acc.expenses + r.summary.expenses,
      expected: acc.expected + r.summary.expected,
      balance: acc.balance + (r.balance ?? 0),
    }),
    { sales: 0, expenses: 0, expected: 0, balance: 0 },
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Riwayat Cash Close Out</h2>
          <p className="text-sm text-muted-foreground">
            Berdasarkan tanggal check-in kasir · {rangeLabel(range)}
          </p>
        </div>
        <Badge variant="outline" className="border-accent text-accent">
          {rows.length} shift
        </Badge>
      </header>

      {rows.length === 0 ? (
        <p className="surface-panel p-10 text-center text-muted-foreground">
          Belum ada shift kasir pada periode ini.
        </p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-4">
            <Stat label="Cash dari penjualan" value={formatRupiah(totals.sales)} />
            <Stat label="Pengeluaran" value={formatRupiah(totals.expenses)} />
            <Stat label="Cash expected" value={formatRupiah(totals.expected)} />
            <Stat label="Selisih kas" value={formatRupiah(totals.balance)} highlight />
          </section>

          <section className="surface-panel overflow-x-auto p-4 sm:p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kasir</TableHead>
                  <TableHead>Close out oleh</TableHead>
                  <TableHead>Opening</TableHead>
                  <TableHead>Closing</TableHead>
                  <TableHead className="text-right">Start cash</TableHead>
                  <TableHead className="text-right">Paid in</TableHead>
                  <TableHead className="text-right">Paid out</TableHead>
                  <TableHead className="text-right">Cash penjualan</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Selisih</TableHead>
                  <TableHead>Catatan selisih</TableHead>
                  <TableHead className="text-right">Next start cash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ shift, summary, actual, balance }) => (
                  <TableRow key={shift.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {shift.cashierName}
                      {!shift.closedAt && (
                        <span className="block text-xs text-muted-foreground">
                          masih berjalan
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{stamp(shift.openedAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{stamp(shift.closedAt)}</TableCell>
                    <TableCell className="text-right">{formatRupiah(shift.startCash)}</TableCell>
                    <TableCell className="text-right">{formatRupiah(summary.paidIn)}</TableCell>
                    <TableCell className="text-right">{formatRupiah(summary.paidOut)}</TableCell>
                    <TableCell className="text-right">{formatRupiah(summary.sales)}</TableCell>
                    <TableCell className="text-right">{formatRupiah(summary.expenses)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatRupiah(summary.expected)}
                    </TableCell>
                    <TableCell className="text-right">
                      {actual === null ? "-" : formatRupiah(actual)}
                    </TableCell>
                    <TableCell
                      className={
                        balance === null
                          ? "text-right"
                          : balance < 0
                            ? "text-right font-semibold text-destructive"
                            : "text-right font-semibold text-accent"
                      }
                    >
                      {balance === null ? "-" : formatRupiah(balance)}
                    </TableCell>
                    <TableCell>{shift.balanceNote || "-"}</TableCell>
                    <TableCell className="text-right">
                      {shift.nextStartCash === undefined
                        ? "-"
                        : formatRupiah(shift.nextStartCash)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="surface-panel p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={
          highlight
            ? "font-display text-2xl font-bold text-accent"
            : "font-display text-2xl font-bold"
        }
      >
        {value}
      </p>
    </div>
  );
}
