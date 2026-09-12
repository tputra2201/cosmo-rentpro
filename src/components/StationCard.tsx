import { Gamepad2, Clock, Utensils, Infinity as InfinityIcon, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  formatClock,
  formatRupiah,
  elapsedSeconds,
  remainingSeconds,
  rentalTotal,
  fnbTotal,
  paidTotal,
  stationStatus,
  activeBooking,
  isPaused,
  useBilling,
  type Station,
} from "@/lib/billing-store";

const statusLabel = {
  idle: "Tersedia",
  booked: "Booking",
  playing: "Sedang Main",
  timeup: "Waktu Habis",
  maintenance: "Maintenance",
  offline: "Offline",
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
  const { bookings } = useBilling();
  const status = stationStatus(station, now, bookings);
  const booking = station.session ? undefined : activeBooking(bookings, station.id, now);
  const session = station.session;
  const total = session ? rentalTotal(session, now) + fnbTotal(session) : 0;
  const paid = paidTotal(session);
  const due = Math.max(0, total - paid);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "surface-panel group relative overflow-hidden p-3 text-left transition-transform duration-200 hover:-translate-y-1",
        status === "idle" && "opacity-90 hover:glow-primary",
        status === "booked" && "border-primary/60 glow-primary",
        status === "playing" && "glow-accent",
        status === "timeup" && "alarm-pulse",
        status === "maintenance" && "border-warning/60",
        status === "offline" && "opacity-55",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl font-extrabold uppercase tracking-wide text-primary">
            {station.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Gamepad2 className="size-3.5" />
            {station.console}
            <span aria-hidden="true">·</span>
            {station.booth}
          </p>
        </div>
        <div className="flex max-w-[45%] shrink-0 flex-col items-end gap-1">
        {(session?.customerName || booking?.customerName) && (
          <p className="max-w-full truncate text-right text-[11px] font-semibold text-foreground">
            {session?.customerName || booking?.customerName}
          </p>
        )}
        <Badge
          variant="outline"
          className={cn(
            "border-current text-[10px] uppercase tracking-wider",
            status === "idle" && "text-muted-foreground",
            status === "booked" && "text-primary",
            status === "playing" && "text-accent",
            status === "timeup" && "text-destructive",
            status === "maintenance" && "text-warning",
            status === "offline" && "text-muted-foreground",
          )}
        >
          {statusLabel[status]}
        </Badge>
        </div>
      </div>


      <div className="mt-3">
        {!session ? (
          booking ? (
            <div>
              <p className="timer-digits text-2xl text-primary">
                {new Date(booking.startAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {booking.customerName}
              </p>
            </div>
          ) : (
            <p className="timer-digits text-2xl text-muted-foreground">--:--:--</p>
          )
        ) : session.mode === "open" ? (
          <div>
            <p className="timer-digits text-2xl text-accent">
              {formatClock(elapsedSeconds(session, now))}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <InfinityIcon className="size-3" /> Main Sepuasnya
            </p>
          </div>
        ) : (
          <div>
            <p
              className={cn(
                "timer-digits text-2xl",
                status === "timeup" ? "text-destructive" : "text-primary",
              )}
            >
              {formatClock(Math.max(0, remainingSeconds(session, now)))}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" /> Paket {session.durationMin} menit
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2 border-t border-border pt-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {paid > 0 ? "Sisa tagihan" : "Total tagihan"}
          </p>
          <p
            className={cn(
              "font-display text-2xl font-extrabold",
              paid > 0 && due <= 0 ? "text-accent" : "text-neon",
            )}
          >
            {paid > 0 && due <= 0 ? "Lunas" : formatRupiah(due)}
          </p>
          {paid > 0 && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Dibayar {formatRupiah(paid)} dari {formatRupiah(total)}
            </p>
          )}
        </div>
        {session && session.orders.length > 0 && (
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
            <Utensils className="size-3" />
            {session.orders.length}
          </span>
        )}
      </div>
    </button>
  );
}
