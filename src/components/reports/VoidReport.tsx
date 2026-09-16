import { useMemo } from "react";
import { SetupHeading, SetupTable, DetailField } from "@/components/SetupTable";
import { formatRupiah, orderLabel, useBilling, type VoidRecord } from "@/lib/billing-store";
import { inRange, rangeLabel, type ReportRange } from "@/lib/report-range";

const timeLong = (at: number) =>
  new Date(at).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Laporan transaksi yang dibatalkan (VOID) beserta pelakunya. */
export function VoidReport({ range }: { range: ReportRange }) {
  const { voids } = useBilling();

  const rows = useMemo(
    () =>
      (voids ?? [])
        .filter((row) => inRange(row.at, range))
        .sort((a, b) => b.at - a.at),
    [voids, range],
  );

  const total = rows.reduce((sum, r) => sum + r.total, 0);
  const rental = rows.filter((r) => r.kind === "rental").length;
  const cafe = rows.filter((r) => r.kind === "cafe").length;

  return (
    <div className="surface-panel space-y-4 p-4 sm:p-6">
      <SetupHeading title="Laporan VOID" description={rangeLabel(range)} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Jumlah VOID" value={String(rows.length)} />
        <Stat label="VOID Rental / Kafe" value={`${rental} / ${cafe}`} />
        <Stat label="Nilai Dibatalkan" value={formatRupiah(total)} />
      </div>

      <SetupTable<VoidRecord>
        items={rows}
        getId={(r) => r.id}
        getLabel={(r) => r.sourceName}
        emptyText="Tidak ada transaksi yang di-VOID pada periode ini."
        columns={[
          {
            key: "at",
            header: "Waktu",
            className: "whitespace-nowrap",
            render: (r) => <span className="text-xs text-muted-foreground">{timeLong(r.at)}</span>,
          },
          {
            key: "source",
            header: "TV / Meja",
            render: (r) => (
              <span className="font-semibold">
                {r.sourceName}
                <span className="block text-xs font-normal uppercase tracking-wider text-muted-foreground">
                  {r.kind === "rental" ? `Rental${r.console ? ` · ${r.console}` : ""}` : "Kafe"}
                </span>
              </span>
            ),
          },
          {
            key: "customer",
            header: "Pelanggan",
            hideOnMobile: true,
            render: (r) => <span className="text-sm">{r.customerName || "Umum"}</span>,
          },
          {
            key: "total",
            header: "Nilai",
            className: "whitespace-nowrap text-right",
            render: (r) => <span className="font-semibold">{formatRupiah(r.total)}</span>,
          },
          {
            key: "actor",
            header: "Pelaku",
            hideOnMobile: true,
            render: (r) => (
              <span className="text-sm">
                {r.actorName || "Tanpa nama"}
                <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                  {r.actorRole || "-"}
                </span>
              </span>
            ),
          },
        ]}
        renderDetail={(r) => (
          <>
            <DetailField label="Waktu VOID">
              <p className="text-sm">{timeLong(r.at)}</p>
            </DetailField>
            <DetailField label="Pelaku">
              <p className="text-sm">
                {r.actorName || "Tanpa nama"} · {r.actorRole || "-"}
              </p>
            </DetailField>
            <DetailField label="Sumber">
              <p className="text-sm">
                {r.sourceName} · {r.kind === "rental" ? "Rental" : "Kafe"}
                {r.console ? ` · ${r.console}` : ""}
              </p>
            </DetailField>
            <DetailField label="Pelanggan">
              <p className="text-sm">
                {r.customerName || "Umum"}
                {r.customerPhone ? ` · ${r.customerPhone}` : ""}
              </p>
            </DetailField>
            <DetailField label="Rincian Nilai">
              <div className="space-y-1 text-sm">
                {r.kind === "rental" && (
                  <p>
                    Rental {r.minutes ?? 0} menit: {formatRupiah(r.rentalTotal)}
                  </p>
                )}
                {r.addonTotal ? <p>Additional Rental: {formatRupiah(r.addonTotal)}</p> : null}
                <p>Makanan &amp; minuman: {formatRupiah(r.fnbTotal)}</p>
                {r.discount ? <p>Potongan: {formatRupiah(r.discount)}</p> : null}
                {r.paidBefore ? <p>Sudah dibayar sebelum VOID: {formatRupiah(r.paidBefore)}</p> : null}
                <p className="font-semibold">Total dibatalkan: {formatRupiah(r.total)}</p>
              </div>
            </DetailField>
            <DetailField label="Pesanan">
              {r.orders && r.orders.length > 0 ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {r.orders.map((o) => (
                    <li key={o.id}>
                      {orderLabel(o)} × {o.qty} — {formatRupiah(o.price * o.qty)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Tidak ada pesanan.</p>
              )}
            </DetailField>
            <DetailField label="Alasan VOID">
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                {r.reason || "-"}
              </p>
            </DetailField>
          </>
        )}
        detailTitle={(r) => `VOID ${r.sourceName}`}
        detailDescription={(r) => timeLong(r.at)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-4" data-report-stat={label}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold">{value}</p>
    </div>
  );
}
