import { Gamepad2, Clock, Utensils, Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  formatClock,
  formatRupiah,
  elapsedSeconds,
  remainingSeconds,
  rentalTotal,
  fnbTotal,
  stationStatus,
  type Station,
} from "@/lib/billing-store";

const statusLabel = {
  idle: "Tersedia",
  playing: "Sedang Main",
  timeup: "Waktu Habis",
} as const;

export function StationCard({
  station,
  now,
  onClick,
}: {
  station: Station;
  now: number;
  onClick: () => void;
}) {
  const status = stationStatus(station, now);
  const session = station.session;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "surface-panel group relative overflow-hidden p-5 text-left transition-transform duration-200 hover:-translate-y-1",
        status === "idle" && "opacity-90 hover:glow-primary",
        status === "playing" && "glow-accent",
        status === "timeup" && "alarm-pulse",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl font-bold">{station.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Gamepad2 className="size-4" />
            {station.console}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "border-current text-xs uppercase tracking-wider",
            status === "idle" && "text-muted-foreground",
            status === "playing" && "text-accent",
            status === "timeup" && "text-destructive",
          )}
        >
          {statusLabel[status]}
        </Badge>
      </div>

      <div className="mt-6">
        {!session ? (
          <p className="timer-digits text-4xl text-muted-foreground">--:--:--</p>
        ) : session.mode === "open" ? (
          <div>
            <p className="timer-digits text-4xl text-accent">
              {formatClock(elapsedSeconds(session, now))}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <InfinityIcon className="size-3.5" /> Main Sepuasnya
            </p>
          </div>
        ) : (
          <div>
            <p
              className={cn(
                "timer-digits text-4xl",
                status === "timeup" ? "text-destructive" : "text-primary",
              )}
            >
              {formatClock(Math.max(0, remainingSeconds(session, now)))}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> Paket {session.durationMin} menit
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Total tagihan
          </p>
          <p className="font-display text-lg font-semibold">
            {session
              ? formatRupiah(rentalTotal(session, now) + fnbTotal(session))
              : formatRupiah(0)}
          </p>
        </div>
        {session && session.orders.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Utensils className="size-3.5" />
            {session.orders.length} item
          </span>
        )}
      </div>
    </button>
  );
}
