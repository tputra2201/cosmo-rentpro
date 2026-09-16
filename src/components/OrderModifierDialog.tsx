import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  formatRupiah,
  optionLabel,
  type MenuItem,
  type MenuOption,
} from "@/lib/billing-store";

export const hasMenuOptions = (item: MenuItem) =>
  (item.variants?.length ?? 0) > 0 ||
  (item.sizes?.length ?? 0) > 0 ||
  (item.toppings?.length ?? 0) > 0 ||
  (item.modifiers?.length ?? 0) > 0;

/** Pilih varian, ukuran, topping, dan opsi lain sebelum menambah pesanan. */
export function OrderModifierDialog({
  item,
  onOpenChange,
  onConfirm,
}: {
  item: MenuItem | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mods: string[], priceAdd: number) => void;
}) {
  const [variant, setVariant] = useState<MenuOption | null>(null);
  const [size, setSize] = useState<MenuOption | null>(null);
  const [toppings, setToppings] = useState<MenuOption[]>([]);
  const [mods, setMods] = useState<string[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    setVariant(null);
    setSize(null);
    setToppings([]);
    setMods([]);
    setNote("");
  }, [item?.id]);

  const priceAdd = useMemo(
    () =>
      (variant?.price ?? 0) +
      (size?.price ?? 0) +
      toppings.reduce((sum, t) => sum + t.price, 0),
    [variant, size, toppings],
  );

  const labels = [
    ...(variant ? [optionLabel(variant)] : []),
    ...(size ? [optionLabel(size)] : []),
    ...toppings.map(optionLabel),
    ...mods,
    ...(note.trim() ? [`Notes: ${note.trim()}`] : []),
  ];

  const single = (
    title: string,
    options: MenuOption[],
    value: MenuOption | null,
    set: (v: MenuOption | null) => void,
  ) =>
    options.length === 0 ? null : (
      <div className="space-y-2">
        <p className="text-sm font-medium">{title}</p>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const on = value?.name === o.name;
            return (
              <Button
                key={o.name}
                size="sm"
                variant={on ? "default" : "outline"}
                aria-pressed={on}
                onClick={() => set(on ? null : o)}
              >
                {optionLabel(o)}
              </Button>
            );
          })}
        </div>
      </div>
    );

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item?.name} · {formatRupiah((item?.price ?? 0) + priceAdd)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {single("Varian", item?.variants ?? [], variant, setVariant)}
          {single("Ukuran", item?.sizes ?? [], size, setSize)}

          {(item?.toppings?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Topping</p>
              <div className="flex flex-wrap gap-2">
                {(item?.toppings ?? []).map((o) => {
                  const on = toppings.some((t) => t.name === o.name);
                  return (
                    <Button
                      key={o.name}
                      size="sm"
                      variant={on ? "default" : "outline"}
                      aria-pressed={on}
                      onClick={() =>
                        setToppings((prev) =>
                          on ? prev.filter((t) => t.name !== o.name) : [...prev, o],
                        )
                      }
                    >
                      {optionLabel(o)}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {(item?.modifiers?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Opsi lain</p>
              <div className="flex flex-wrap gap-2">
                {(item?.modifiers ?? []).map((o) => {
                  const on = mods.includes(o);
                  return (
                    <Button
                      key={o}
                      size="sm"
                      variant={on ? "default" : "outline"}
                      aria-pressed={on}
                      onClick={() =>
                        setMods((prev) => (on ? prev.filter((p) => p !== o) : [...prev, o]))
                      }
                    >
                      {o}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Notes</p>
            <Textarea
              value={note}
              aria-label="Notes pesanan"
              placeholder="mis. mie setengah matang, tambahkan cabe rawit"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => onConfirm(labels, priceAdd)}>Tambah pesanan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
