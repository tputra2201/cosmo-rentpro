import { Link } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { useBilling } from "@/lib/billing-store";

const MESSAGE =
  "Kasir belum memulai shift. Buka menu Shift Kasir dan lakukan check-in dulu.";

/**
 * Semua transaksi uang (rental, kafe, kartu, kas) hanya boleh jalan
 * bila ada shift kasir yang terbuka.
 */
export function useShiftGate() {
  const { shiftOpen } = useBilling();
  return {
    shiftOpen,
    /** True bila boleh lanjut; bila tidak, tampilkan pesan. */
    requireShift: () => {
      if (shiftOpen) return true;
      toast.error("Shift kasir belum dibuka", { description: MESSAGE });
      return false;
    },
  };
}

export function ShiftLockedNotice({ className = "" }: { className?: string }) {
  const { shiftOpen } = useBilling();
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
