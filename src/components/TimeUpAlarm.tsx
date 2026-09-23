import { useEffect, useMemo, useState } from "react";
import { AlarmClock } from "lucide-react";

import { useBilling, stationStatus } from "@/lib/billing-store";
import { useAuth } from "@/lib/auth";
import { alarmCycleMs, playAlarm, stopAlarm } from "@/lib/alarm";
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
 * Hanya muncul bila ada pengguna yang sedang masuk — perangkat yang berada di
 * halaman masuk (sudah keluar) tidak lagi menampilkan notifikasi ini.
 */
export function TimeUpAlarm() {
  const { stations, bookings, now, sessionSecurity } = useBilling();
  const { session } = useAuth();
  const signedIn = Boolean(session);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Satu kali konfirmasi berlaku untuk sesi tersebut, jadi popup tidak muncul
  // lagi walau waktu ditambah atau dikurangi.
  const keyOf = (station: (typeof stations)[number]) =>
    `${station.id}:${station.session?.startAt ?? 0}`;

  const activeKeys = useMemo(
    () => stations.filter((station) => station.session).map((station) => keyOf(station)),
    [stations],
  );

  // Bersihkan konfirmasi lama saat sesi sudah berakhir.
  useEffect(() => {
    setDismissed((prev) => {
      const next = prev.filter((key) => activeKeys.includes(key));
      return next.length === prev.length ? prev : next;
    });
  }, [activeKeys]);

  const due = useMemo(() => {
    if (!signedIn) return null;
    return (
      stations.find(
        (station) =>
          stationStatus(station, now, bookings) === "timeup" &&
          !dismissed.includes(keyOf(station)),
      ) ?? null
    );
  }, [stations, bookings, now, dismissed, signedIn]);

  const key = due ? keyOf(due) : "";


  useEffect(() => {
    if (!key || !sessionSecurity.alarmEnabled) return;
    const play = () => playAlarm(sessionSecurity.alarmSound, sessionSecurity.alarmVolume);
    play();
    if (!sessionSecurity.alarmRepeat) {
      return () => stopAlarm();
    }
    const timer = setInterval(
      play,
      Math.max(1500, alarmCycleMs(sessionSecurity.alarmSound) + 1500),
    );
    return () => {
      clearInterval(timer);
      stopAlarm();
    };
  }, [
    key,
    sessionSecurity.alarmEnabled,
    sessionSecurity.alarmSound,
    sessionSecurity.alarmVolume,
    sessionSecurity.alarmRepeat,
  ]);

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
