import { createFileRoute } from "@tanstack/react-router";
import { Gamepad2, Receipt, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  elapsedSeconds,
  fnbTotal,
  formatClock,
  formatRupiah,
  remainingSeconds,
  rentalTotal,
  stationStatus,
  useBilling,
  type ConsoleType,
} from "@/lib/billing-store";

export const Route = createFileRoute("/_authenticated/kasir")({
  head: () => ({
    meta: [
      { title: "Layar Kasir — RenToPlay" },
      {
        name: "description",
        content:
          "Layar kasir untuk pelanggan: lihat tarif per jam tiap konsol dan total billing berjalan dari setiap TV yang sedang aktif.",
      },
      { property: "og:title", content: "Layar Kasir — RenToPlay" },
      {
        property: "og:description",
        content:
          "Tarif per jam PS3, PS4, PS5 dan total tagihan berjalan tiap TV secara real-time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KasirPage,
});


function KasirPage() {
  const { stations, rates, consoleTypes, now } = useBilling();

  const active = stations.filter((s) => s.session);
  const grandTotal = active.reduce(
    (sum, s) =>
      sum + (s.session ? rentalTotal(s.session, now) + fnbTotal(s.session) : 0),
    0,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-neon sm:text-3xl">
          Layar Kasir
        </h1>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {consoleTypes.map((c) => (
          <Card key={c} className="surface-panel">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Gamepad2 className="size-4 text-primary" />
                {c}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold text-neon">
                {formatRupiah(rates[c] ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">per jam</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold tracking-wide">
            TV Sedang Aktif ({active.length})
          </h2>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total berjalan</p>
            <p className="font-display text-xl font-bold text-neon">
              {formatRupiah(grandTotal)}
            </p>
          </div>
        </div>

        {active.length === 0 ? (
          <Card className="surface-panel">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Belum ada TV yang sedang bermain.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((station) => {
              const session = station.session;
              if (!session) return null;
              const status = stationStatus(station, now);
              const rental = rentalTotal(session, now);
              const fnb = fnbTotal(session);
              const timeLabel =
                session.mode === "open"
                  ? formatClock(elapsedSeconds(session, now))
                  : formatClock(Math.max(0, remainingSeconds(session, now)));

              return (
                <Card
                  key={station.id}
                  className={`surface-panel ${
                    status === "timeup" ? "border-destructive/60" : ""
                  }`}
                >
                  <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-base">{station.name}</CardTitle>
                    <Badge
                      variant={status === "timeup" ? "destructive" : "secondary"}
                    >
                      {status === "timeup"
                        ? "Waktu Habis"
                        : session.mode === "open"
                          ? "Main Sepuasnya"
                          : "Per Jam"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {station.console} · {formatRupiah(session.rate)}/jam
                      </span>
                      <span className="timer-digits text-lg">{timeLabel}</span>
                    </div>
                    <div className="space-y-1 border-t border-border pt-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rental</span>
                        <span>{formatRupiah(rental)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Utensils className="size-3.5" />
                          Makanan/Minuman
                        </span>
                        <span>{formatRupiah(fnb)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Receipt className="size-4 text-primary" />
                          Total
                        </span>
                        <span className="text-neon">
                          {formatRupiah(rental + fnb)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
