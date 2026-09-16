import { useMemo } from "react";
import { SetupHeading, SetupTable, DetailField } from "@/components/SetupTable";
import { useBilling, type LogEntry } from "@/lib/billing-store";
import { inRange, rangeLabel, type ReportRange } from "@/lib/report-range";

const timeShort = (at: number) =>
  new Date(at).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

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
    <div className="surface-panel p-4 sm:p-6">
      <SetupHeading title="Log Book Aktivitas" description={rangeLabel(range)} />

      <SetupTable<LogEntry>
        items={rows}
        getId={(r) => r.id}
        getLabel={(r) => r.action}
        emptyText="Belum ada aktivitas tercatat pada periode ini."
        columns={[
          {
            key: "at",
            header: "Waktu",
            className: "whitespace-nowrap",
            render: (r) => <span className="text-xs text-muted-foreground">{timeShort(r.at)}</span>,
          },
          {
            key: "action",
            header: "Aktivitas",
            render: (r) => <span className="font-semibold">{r.action}</span>,
          },
          {
            key: "actor",
            header: "Petugas",
            hideOnMobile: true,
            render: (r) => (
              <span className="text-sm">
                {r.actor || "Tanpa nama"}
                <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                  {r.role || "-"}
                </span>
              </span>
            ),
          },
        ]}
        renderDetail={(r) => (
          <>
            <DetailField label="Waktu">
              <p className="text-sm">{timeShort(r.at)}</p>
            </DetailField>
            <DetailField label="Petugas">
              <p className="text-sm">
                {r.actor || "Tanpa nama"} · {r.role || "-"}
              </p>
            </DetailField>
            <DetailField label="Detail">
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                {r.detail || "-"}
              </p>
            </DetailField>
          </>
        )}
        detailTitle={(r) => r.action}
        detailDescription={(r) => timeShort(r.at)}
      />
    </div>
  );
}
