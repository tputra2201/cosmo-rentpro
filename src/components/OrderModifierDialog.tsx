import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRupiah, type MenuItem } from "@/lib/billing-store";

/** Pilih opsi modifikasi (mis. Less sugar, Iced, Pedas) sebelum menambah pesanan. */
export function OrderModifierDialog({
  item,
  onOpenChange,
  onConfirm,
}: {
  item: MenuItem | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mods: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    setPicked([]);
  }, [item?.id]);

  const options = item?.modifiers ?? [];

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {item?.name} · {formatRupiah(item?.price ?? 0)}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const on = picked.includes(o);
            return (
              <Button
                key={o}
                size="sm"
                variant={on ? "default" : "outline"}
                aria-pressed={on}
                onClick={() =>
                  setPicked((prev) => (on ? prev.filter((p) => p !== o) : [...prev, o]))
                }
              >
                {o}
              </Button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => onConfirm(picked)}>Tambah pesanan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
