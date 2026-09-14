import { useMemo } from "react";
import { useBilling } from "@/lib/billing-store";
import { inRange, rangeLabel, type ReportRange } from "@/lib/report-range";

/** Catatan aktivitas non-transaksi: siapa, kapan, dan apa yang dilakukan. */
export function LogBookReport({ range }: { range: ReportRange }) {
  const { logEntries } = useBilling();

  const rows = useMemo(
    () =>
      (logEntries ?? [])
        .filter((row) => inRange(row.at, range))
        .sort((a, b) => b.at - a.at),
    [logEntries, range],
  );

  return (
    <div className="surface-panel overflow-hidden">
      <div className="border-b border-border p-4">
        <h2 className="font-display text-lg font-bold">Log Book Aktivitas</h2>
        <p className="text-xs text-muted-foreground">{rangeLabel(range)}</p>
      </div>

      {rows.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          Belum ada aktivitas tercatat pada periode ini.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 p-4">
              <span className="w-32 shrink-0 text-xs text-muted-foreground">
                {new Date(row.at).toLocaleString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{row.action}</span>
                {row.detail ? (
                  <span className="block break-words text-xs text-muted-foreground">
                    {row.detail}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-right text-xs text-muted-foreground">
                <span className="block font-semibold text-foreground">
                  {row.actor || "Tanpa nama"}
                </span>
                <span className="block uppercase tracking-wider">{row.role || "-"}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
