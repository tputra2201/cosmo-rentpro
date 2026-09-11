import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Activity, Coins, MonitorPlay, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StationCard } from "@/components/StationCard";
import { StationDialog } from "@/components/StationDialog";
import {
  fnbTotal,
  formatRupiah,
  playAlarm,
  rentalTotal,
  stationStatus,
  useBilling,
} from "@/lib/billing-store";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard TV — Billing Rental PS" },
      {
        name: "description",
        content:
          "Pantau semua TV rental PlayStation: status kosong, sedang main, atau waktu habis, lengkap dengan timer dan total tagihan.",
      },
      { property: "og:title", content: "Dashboard TV — Billing Rental PS" },
      {
        property: "og:description",
        content:
          "Pantau status dan timer setiap TV rental PlayStation secara real-time.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { stations, now, addStation } = useBilling();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const alerted = useRef<Set<string>>(new Set());

  useEffect(() => {
    stations.forEach((station) => {
      const status = stationStatus(station, now);
      if (status === "timeup" && !alerted.current.has(station.id)) {
        alerted.current.add(station.id);
        playAlarm();
        toast.error(`Waktu ${station.name} habis!`, {
          description: "Silakan akhiri sesi atau tambah waktu.",
          duration: 15000,
        });
      }
      if (status !== "timeup") alerted.current.delete(station.id);
    });
  }, [stations, now]);

  const active = stations.filter((s) => s.session);
  const available = stations.filter((s) => stationStatus(s, now) === "idle");
  const openBill = active.reduce(
    (sum, s) =>
      sum +
      (s.session
        ? Math.max(
            0,
            rentalTotal(s.session, now) +
              fnbTotal(s.session) -
              paidTotal(s.session),
          )
        : 0),
    0,
  );
  const selected = stations.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Dashboard TV</h1>
          <p className="mt-1 text-muted-foreground">
            Klik kartu TV untuk mulai sesi, tambah pesanan, atau akhiri billing.
          </p>
        </div>
        <Button variant="outline" onClick={() => addStation()}>
          <Plus className="size-4" /> Tambah TV
        </Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<MonitorPlay className="size-5" />}
          label="TV Tersedia"
          value={`${available.length} / ${stations.length}`}
        />
        <StatCard
          icon={<Activity className="size-5" />}
          label="Sedang Main"
          value={String(active.length)}
        />
        <StatCard
          icon={<Coins className="size-5" />}
          label="Tagihan Berjalan"
          value={formatRupiah(openBill)}
        />
        <StatCard icon={<Coins className="size-5" />} label="Pendapatan Hari Ini" value={formatRupiah(0)} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stations.map((station) => (
          <StationCard
            key={station.id}
            station={station}
            now={now}
            onClick={() => setSelectedId(station.id)}
          />
        ))}
      </section>

      <StationDialog
        station={selected}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="surface-panel flex items-center gap-4 p-5">
      <span className="flex size-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </span>
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="font-display text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}
