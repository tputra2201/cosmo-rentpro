import { useEffect, useMemo, useState } from "react";
import { AlarmClock } from "lucide-react";

import { useBilling, stationStatus } from "@/lib/billing-store";
import { alarmCycleMs, playAlarm } from "@/lib/alarm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Popup dan alarm saat waktu rental habis.
 * Tetap muncul walau layar sedang di halaman masuk (misal setelah keluar
 * otomatis), karena timer sesi terus berjalan sesuai jam sebenarnya.
 */
export function TimeUpAlarm() {
  const { stations, bookings, now, sessionSecurity } = useBilling();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const keyOf = (station: (typeof stations)[number]) =>
    `${station.id}:${station.session?.startAt ?? 0}:${station.session?.durationMin ?? 0}:${
      station.session?.bonusMin ?? 0
    }`;

  const due = useMemo(() => {
    return (
      stations.find(
        (station) =>
          stationStatus(station, now, bookings) === "timeup" &&
          !dismissed.includes(keyOf(station)),
      ) ?? null
    );
  }, [stations, bookings, now, dismissed]);

  const key = due ? keyOf(due) : "";


  useEffect(() => {
    if (!key || !sessionSecurity.alarmEnabled) return;
    playAlarm(sessionSecurity.alarmSound);
    if (!sessionSecurity.alarmRepeat) return;
    const timer = setInterval(
      () => playAlarm(sessionSecurity.alarmSound),
      Math.max(1500, alarmCycleMs(sessionSecurity.alarmSound) + 1500),
    );
    return () => clearInterval(timer);
  }, [key, sessionSecurity.alarmEnabled, sessionSecurity.alarmSound, sessionSecurity.alarmRepeat]);

  if (!due) return null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) setDismissed((prev) => [...prev, key]);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlarmClock className="size-5 text-primary" /> Waktu rental habis
          </DialogTitle>
          <DialogDescription className="text-base text-foreground">
            Waktu bermain <strong>{due.session?.customerName || "Umum"}</strong> di{" "}
            <strong>{due.name}</strong> sudah habis!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="w-full" onClick={() => setDismissed((prev) => [...prev, key])}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
