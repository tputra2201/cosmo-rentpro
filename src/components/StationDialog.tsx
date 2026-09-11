import { useState } from "react";
import { Play, Square, Plus, Trash2, Timer, Infinity as InfinityIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  elapsedSeconds,
  fnbTotal,
  formatClock,
  formatRupiah,
  remainingSeconds,
  rentalTotal,
  useBilling,
  type ConsoleType,
  type Station,
} from "@/lib/billing-store";

const DURATIONS = [30, 60, 90, 120, 180];

export function StationDialog({
  station,
  open,
  onOpenChange,
}: {
  station: Station | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    now,
    rates,
    menu,
    startSession,
    stopSession,
    addTime,
    addOrder,
    removeOrder,
    setStationConsole,
  } = useBilling();
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState("");

  if (!station) return null;
  const session = station.session;
  const rate = rates[station.console];

  const handleStop = () => {
    const record = stopSession(station.id);
    onOpenChange(false);
    if (record) {
      toast.success(`${record.stationName} selesai`, {
        description: `Total dibayar ${formatRupiah(record.total)}`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {station.name}
          </DialogTitle>
          <DialogDescription>
            {station.console} &middot; {formatRupiah(rate)} / jam
          </DialogDescription>
        </DialogHeader>

        {!session ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">Jenis konsol</p>
              <Select
                value={station.console}
                onValueChange={(v) =>
                  setStationConsole(station.id, v as ConsoleType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["PS3", "PS4", "PS5"] as ConsoleType[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c} — {formatRupiah(rates[c])} / jam
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Bermain per Jam (bayar di muka)</p>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={duration === d ? "default" : "outline"}
                    onClick={() => {
                      setDuration(d);
                      setCustomDuration("");
                    }}
                  >
                    {d} mnt
                  </Button>
                ))}
                <Input
                  type="number"
                  min={1}
                  placeholder="Menit lain"
                  value={customDuration}
                  onChange={(e) => {
                    setCustomDuration(e.target.value);
                    const v = Number(e.target.value);
                    if (v > 0) setDuration(v);
                  }}
                  className="h-8 w-28"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Harga paket: {formatRupiah((rate * duration) / 60)}
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  startSession(station.id, "prepaid", duration);
                  toast.success(`${station.name} mulai ${duration} menit`);
                }}
              >
                <Play className="size-4" /> Mulai Paket
              </Button>
            </div>

            <Separator />

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                startSession(station.id, "open", 0);
                toast.success(`${station.name} mulai Main Sepuasnya`);
              }}
            >
              <InfinityIcon className="size-4" /> Mulai Main Sepuasnya
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="surface-panel p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {session.mode === "open" ? "Waktu berjalan" : "Sisa waktu"}
              </p>
              <p className="timer-digits mt-1 text-4xl">
                {session.mode === "open"
                  ? formatClock(elapsedSeconds(session, now))
                  : formatClock(Math.max(0, remainingSeconds(session, now)))}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[15, 30, 60].map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    addTime(station.id, m);
                    toast.success(`Tambah ${m} menit di ${station.name}`);
                  }}
                >
                  <Timer className="size-4" /> +{m} mnt
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Pesanan makanan &amp; minuman</p>
              <div className="grid grid-cols-2 gap-2">
                {menu.map((item) => (
                  <Button
                    key={item.id}
                    size="sm"
                    variant="secondary"
                    className="justify-between"
                    onClick={() => {
                      addOrder(station.id, item, 1);
                      toast.success(`${item.name} ditambahkan`);
                    }}
                  >
                    <span className="truncate">{item.name}</span>
                    <Plus className="size-3.5 shrink-0" />
                  </Button>
                ))}
              </div>
              {session.orders.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {session.orders.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between rounded-md bg-secondary px-3 py-1.5 text-sm"
                    >
                      <span>
                        {o.name} × {o.qty}
                      </span>
                      <span className="flex items-center gap-2">
                        {formatRupiah(o.price * o.qty)}
                        <button
                          type="button"
                          onClick={() => removeOrder(station.id, o.id)}
                          aria-label={`Hapus ${o.name}`}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rental</span>
                <span>{formatRupiah(rentalTotal(session, now))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Makanan &amp; minuman</span>
                <span>{formatRupiah(fnbTotal(session))}</span>
              </div>
              <div className="flex justify-between font-display text-lg font-semibold">
                <span>Total</span>
                <span className="text-accent">
                  {formatRupiah(rentalTotal(session, now) + fnbTotal(session))}
                </span>
              </div>
            </div>

            {session.mode === "prepaid" &&
              remainingSeconds(session, now) <= 0 && (
                <Badge variant="destructive" className="w-full justify-center py-1.5">
                  Waktu habis — silakan akhiri atau tambah waktu
                </Badge>
              )}

            <Button variant="destructive" className="w-full" onClick={handleStop}>
              <Square className="size-4" /> Akhiri &amp; Bayar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
