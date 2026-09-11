import { useMemo, useState } from "react";
import { Coffee, Plus, Trash2, Utensils, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah, useBilling, type CafeTable } from "@/lib/billing-store";

export function tableTotal(table: CafeTable) {
  return table.orders.reduce((sum, o) => sum + o.price * o.qty, 0);
}

export function CafeTables({ allowDelete = false }: { allowDelete?: boolean }) {
  const {
    cafeTables,
    menu,
    menuCategories,
    paymentMethods,
    updateCafeTable,
    removeCafeTable,
    addCafeOrder,
    removeCafeOrder,
    clearCafeTable,
    payCafeTable,
  } = useBilling();

  const [openId, setOpenId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("semua");
  const [payMethod, setPayMethod] = useState("");
  const [received, setReceived] = useState("");

  const activeMethods = paymentMethods.filter((p) => p.active);
  const table = cafeTables.find((t) => t.id === openId) ?? null;
  const total = table ? tableTotal(table) : 0;
  const visibleMenu = useMemo(
    () => (category === "semua" ? menu : menu.filter((m) => m.category === category)),
    [menu, category],
  );

  const receivedValue = Number(received) || 0;
  const change = Math.max(0, receivedValue - total);
  const shortage = Math.max(0, total - receivedValue);

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cafeTables.map((t) => {
          const filled = t.orders.length > 0 || Boolean(t.openedAt);
          return (
            <div
              key={t.id}
              className={`surface-panel p-5 ${filled ? "border-primary/50" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.area} · {t.seats} kursi
                  </p>
                </div>
                <Badge variant={filled ? "default" : "secondary"}>
                  {filled ? "Terisi" : "Kosong"}
                </Badge>
              </div>

              <p className="mt-4 text-2xl font-bold text-neon">
                {formatRupiah(tableTotal(t))}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.orders.length} item{t.customerName ? ` · ${t.customerName}` : ""}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setOpenId(t.id);
                    setCategory("semua");
                    setPayMethod(activeMethods[0]?.name ?? "");
                    setReceived("");
                  }}
                >
                  <Utensils className="size-4" /> Pesanan
                </Button>
                {allowDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Hapus ${t.name}`}
                    onClick={() => {
                      if (!removeCafeTable(t.id)) {
                        toast.error(`${t.name} masih terisi`);
                        return;
                      }
                      toast.success(`${t.name} dihapus`);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <Dialog open={Boolean(table)} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {table && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Coffee className="size-5 text-primary" />
                  {table.name}
                </DialogTitle>
                <DialogDescription>
                  {table.area} · {table.seats} kursi
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cafe-customer">Nama pelanggan</Label>
                    <Input
                      id="cafe-customer"
                      value={table.customerName}
                      placeholder="Pelanggan Kafe"
                      onChange={(e) =>
                        updateCafeTable(table.id, { customerName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cafe-notes">Catatan</Label>
                    <Input
                      id="cafe-notes"
                      value={table.notes}
                      placeholder="mis. tanpa gula"
                      onChange={(e) => updateCafeTable(table.id, { notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Menu</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant={category === "semua" ? "default" : "outline"}
                      onClick={() => setCategory("semua")}
                    >
                      Semua
                    </Button>
                    {menuCategories.map((c) => (
                      <Button
                        key={c}
                        size="sm"
                        variant={category === c ? "default" : "outline"}
                        onClick={() => setCategory(c)}
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {visibleMenu.map((item) => (
                      <Button
                        key={item.id}
                        size="sm"
                        variant="secondary"
                        className="h-auto justify-between py-2"
                        onClick={() => {
                          addCafeOrder(table.id, item, 1);
                          toast.success(`${item.name} ditambahkan`);
                        }}
                      >
                        <span className="flex flex-col items-start text-left">
                          <span className="truncate">{item.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatRupiah(item.price)}
                          </span>
                        </span>
                        <Plus className="size-3.5 shrink-0" />
                      </Button>
                    ))}
                    {visibleMenu.length === 0 && (
                      <p className="col-span-2 text-sm text-muted-foreground">
                        Belum ada menu pada kategori ini.
                      </p>
                    )}
                  </div>
                </div>

                {table.orders.length > 0 && (
                  <ul className="space-y-1">
                    {table.orders.map((o) => (
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
                            aria-label={`Hapus ${o.name}`}
                            onClick={() => removeCafeOrder(table.id, o.id)}
                          >
                            <Trash2 className="size-3.5 text-muted-foreground" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="size-4 text-primary" /> Total
                    </span>
                    <span className="text-neon">{formatRupiah(total)}</span>
                  </div>

                  {activeMethods.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Belum ada tipe pembayaran aktif. Atur di menu Pembayaran.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Metode pembayaran</Label>
                        <Select value={payMethod} onValueChange={setPayMethod}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih metode" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeMethods.map((m) => (
                              <SelectItem key={m.id} value={m.name}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cafe-received">Uang diterima</Label>
                        <Input
                          id="cafe-received"
                          type="number"
                          min={0}
                          value={received === "" ? total : received}
                          onChange={(e) => setReceived(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {received === "" || shortage === 0
                      ? `Kembalian: ${formatRupiah(received === "" ? 0 : change)}`
                      : `Kurang: ${formatRupiah(shortage)}`}
                  </p>
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    clearCafeTable(table.id);
                    toast.success(`Pesanan ${table.name} dibatalkan`);
                    setOpenId(null);
                  }}
                >
                  Batalkan pesanan
                </Button>
                <Button
                  disabled={table.orders.length === 0 || activeMethods.length === 0}
                  onClick={() => {
                    const paid = received === "" ? total : receivedValue;
                    if (paid + 0.5 < total) {
                      toast.error("Uang diterima kurang dari total tagihan");
                      return;
                    }
                    const record = payCafeTable(table.id, {
                      payment: payMethod || activeMethods[0]?.name || "Cash",
                      amountPaid: paid,
                    });
                    if (!record) {
                      toast.error("Pembayaran gagal diproses");
                      return;
                    }
                    toast.success(`${table.name} lunas ${formatRupiah(record.total)}`, {
                      description: `${record.payment} · kembalian ${formatRupiah(record.change ?? 0)}`,
                    });
                    setReceived("");
                    setOpenId(null);
                  }}
                >
                  Bayar &amp; selesaikan
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
