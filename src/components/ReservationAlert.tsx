import { useMemo, useState } from "react";
import { BellRing } from "lucide-react";

import { useBilling } from "@/lib/billing-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Popup pemberitahuan saat waktu reservasi sudah tiba. */
export function ReservationAlert() {
  const { bookings, stations, now } = useBilling();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const due = useMemo(() => {
    const list = bookings
      .filter(
        (item) =>
          item.status === "confirmed" &&
          item.startAt <= now &&
          item.endAt >= now &&
          !dismissed.includes(item.id),
      )
      .sort((a, b) => a.startAt - b.startAt);
    return list[0] ?? null;
  }, [bookings, now, dismissed]);

  if (!due) return null;

  const stationName = stations.find((item) => item.id === due.stationId)?.name ?? "Unit";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) setDismissed((prev) => [...prev, due.id]);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="size-5 text-primary" /> Waktu reservasi tiba
          </DialogTitle>
          <DialogDescription className="text-base text-foreground">
            Waktu reservasi <strong>{due.customerName}</strong> di room{" "}
            <strong>{stationName}</strong> sudah tiba!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="w-full" onClick={() => setDismissed((prev) => [...prev, due.id])}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
