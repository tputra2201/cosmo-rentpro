import { Link } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { useBilling } from "@/lib/billing-store";
import { DEVICE_BLOCKED_MESSAGE, useDeviceAccess } from "@/lib/device-guard";

const MESSAGE =
  "Kasir belum memulai shift. Buka menu Shift Kasir dan lakukan check-in dulu.";

/**
 * Semua transaksi uang (rental, kafe, kartu, kas) hanya boleh jalan
 * bila ada shift kasir yang terbuka dan perangkatnya terdaftar di data store.
 */
export function useShiftGate() {
  const { shiftOpen } = useBilling();
  const { allowed: deviceAllowed } = useDeviceAccess();
  return {
    shiftOpen,
    /** True bila boleh lanjut; bila tidak, tampilkan pesan. */
    requireShift: () => {
      if (!deviceAllowed) {
        toast.error("Perangkat tidak terdaftar", {
          description: DEVICE_BLOCKED_MESSAGE,
          duration: 10000,
        });
        return false;
      }
      if (shiftOpen) return true;
      toast.error("Shift kasir belum dibuka", { description: MESSAGE });
      return false;
    },
  };
}

export function ShiftLockedNotice({ className = "" }: { className?: string }) {
  const { shiftOpen } = useBilling();
  const { allowed: deviceAllowed } = useDeviceAccess();
  if (!deviceAllowed) {
    return (
      <div
        className={`flex flex-wrap items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm ${className}`}
      >
        <LockKeyhole className="size-4 shrink-0 text-destructive" />
        <span className="flex-1">{DEVICE_BLOCKED_MESSAGE}</span>
      </div>
    );
  }
  if (shiftOpen) return null;
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm ${className}`}
    >
      <LockKeyhole className="size-4 shrink-0 text-warning" />
      <span className="flex-1">{MESSAGE}</span>
      <Link to="/shift" className="font-semibold text-warning underline">
        Buka Shift Kasir
      </Link>
    </div>
  );
}
