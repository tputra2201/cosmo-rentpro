import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Monitor, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  formatClock,
  elapsedSeconds,
  remainingSeconds,
  useBilling,
} from "@/lib/billing-store";

export const Route = createFileRoute("/_authenticated/tv")({
  head: () => ({
    meta: [
      { title: "Layar TV Pelanggan — RenToPlay" },
      {
        name: "description",
        content:
          "Tampilan layar TV pelanggan: sisa waktu bermain, peringatan 5 menit terakhir, dan peringatan saat waktu habis.",
      },
      { property: "og:title", content: "Layar TV Pelanggan — RenToPlay" },
      {
        property: "og:description",
        content:
          "Peringatan otomatis di layar TV saat sisa waktu bermain 5 menit dan saat waktu habis.",
      },
    ],
  }),
  component: TvScreen,
});

const PICK_KEY = "tv-display-station-v1";

function TvScreen() {
  const { stations, now, tvNotice, setTvNotice } = useBilling();
  const navigate = useNavigate();
  const [stationId, setStationId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStationId(localStorage.getItem(PICK_KEY));
    setReady(true);
  }, []);

  const choose = (id: string | null) => {
    if (id) localStorage.setItem(PICK_KEY, id);
    else localStorage.removeItem(PICK_KEY);
    setStationId(id);
  };

  const station = stations.find((s) => s.id === stationId) ?? null;

  if (!ready) return null;

  if (!station) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Pilih unit TV untuk layar ini</h1>
          <Button variant="outline" onClick={() => navigate({ to: "/" })}>
            <LogOut className="size-4" /> Exit
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stations.map((s) => (
            <Button
              key={s.id}
              variant="outline"
              className="h-16 flex-col gap-1"
              onClick={() => choose(s.id)}
            >
              <span className="flex items-center gap-2 font-semibold">
                <Monitor className="size-4" /> {s.name}
              </span>
              <span className="text-xs text-muted-foreground">{s.console}</span>
            </Button>
          ))}
        </div>

        <section className="surface-panel mt-8 p-6">
          <h2 className="text-xl font-semibold">Notifikasi di Layar TV</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tv-warn-min">Peringatan muncul saat sisa (menit)</Label>
              <Input
                id="tv-warn-min"
                type="number"
                min={1}
                value={tvNotice.warnMinutes}
                onChange={(e) =>
                  setTvNotice({ warnMinutes: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tv-count">Hitungan sebelum layar tertutup (detik)</Label>
              <Input
                id="tv-count"
                type="number"
                min={0}
                value={tvNotice.countdownSec}
                onChange={(e) =>
                  setTvNotice({ countdownSec: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tv-warn-text">Teks peringatan sisa waktu</Label>
              <Input
                id="tv-warn-text"
                value={tvNotice.warnText}
                onChange={(e) => setTvNotice({ warnText: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tv-end-text">Teks saat waktu habis</Label>
              <Input
                id="tv-end-text"
                value={tvNotice.endText}
                onChange={(e) => setTvNotice({ endText: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tv-block-title">Judul peringatan besar</Label>
              <Input
                id="tv-block-title"
                value={tvNotice.blockTitle}
                onChange={(e) => setTvNotice({ blockTitle: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tv-block-text">Keterangan peringatan besar</Label>
              <Input
                id="tv-block-text"
                value={tvNotice.blockText}
                onChange={(e) => setTvNotice({ blockText: e.target.value })}
              />
            </div>
          </div>
        </section>
      </div>
    );
  }

  const session = station.session;
  const remaining = session && session.mode === "prepaid" ? remainingSeconds(session, now) : null;
  const warnAt = Math.max(0, Math.round(tvNotice.warnMinutes)) * 60;
  const showWarn = remaining !== null && remaining > 0 && remaining <= warnAt;
  const overSec = remaining !== null && remaining <= 0 ? Math.floor(-remaining) : null;
  const countLeft =
    overSec === null ? null : Math.max(0, Math.round(tvNotice.countdownSec) - overSec);
  const showBlock = countLeft !== null && countLeft <= 0;

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Banner kecil di bagian atas layar TV */}
      {(showWarn || countLeft !== null) && !showBlock && (
        <div
          className={cn(
            "absolute inset-x-0 top-0 z-20 px-4 py-3 text-center text-base font-semibold shadow-lg sm:text-lg",
            showWarn ? "bg-warning text-black" : "bg-destructive text-white",
          )}
        >
          {showWarn ? (
            tvNotice.warnText
          ) : (
            <span className="alarm-pulse">
              {tvNotice.endText} ({countLeft})
            </span>
          )}
        </div>
      )}

      {/* Info kecil di sudut, tidak menutupi tampilan game */}
      <div className="absolute bottom-4 right-4 z-10 rounded-lg bg-white/10 px-4 py-2 text-right backdrop-blur">
        <p className="text-xs uppercase tracking-wider text-white/70">
          {station.name} · {station.console}
        </p>
        <p className="timer-digits text-2xl">
          {!session
            ? "--:--:--"
            : session.mode === "open"
              ? formatClock(elapsedSeconds(session, now))
              : formatClock(Math.max(0, remaining ?? 0))}
        </p>
      </div>

      {/* Peringatan besar setelah hitungan selesai */}
      {showBlock && (
        <div className="absolute inset-x-0 top-0 z-30 flex h-[85vh] flex-col items-center justify-center gap-6 bg-destructive/95 px-8 text-center">
          <h1 className="alarm-pulse font-display text-4xl font-extrabold uppercase tracking-wide sm:text-6xl">
            {tvNotice.blockTitle}
          </h1>
          <p className="max-w-3xl text-xl font-semibold sm:text-3xl">
            {tvNotice.blockText}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => choose(null)}
        className="absolute bottom-3 left-3 z-40 flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] text-white/60"
      >
        <Settings className="size-3" /> Ganti unit
      </button>

      <button
        type="button"
        onClick={() => {
          choose(null);
          navigate({ to: "/" });
        }}
        className="absolute bottom-3 left-28 z-40 flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] text-white/60"
      >
        <LogOut className="size-3" /> Exit
      </button>
    </div>
  );
}
