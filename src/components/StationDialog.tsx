import { useState } from "react";
import { Play, Square, Plus, Trash2, Timer, Infinity as InfinityIcon, Banknote, CheckCircle2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  elapsedSeconds,
  fnbTotal,
  formatClock,
  formatRupiah,
  paidTotal,
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
    consoleTypes,
    menu,
    startSession,
    stopSession,
    settleSession,
    removeSettlement,
    addTime,
    addOrder,
    removeOrder,
    setStationConsole,
    paymentMethods,
    packages,
    defaultBonusMin,
    adjustBonusTime,
  } = useBilling();
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState("");
  const [payment, setPayment] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [member, setMember] = useState(false);
  const [packageId, setPackageId] = useState("");
  const [notes, setNotes] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [splitMode, setSplitMode] = useState(false);
  const [splits, setSplits] = useState<{ method: string; amount: string }[]>([]);
  const [bonus, setBonus] = useState(String(defaultBonusMin ?? 0));
  const [confirmPay, setConfirmPay] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const bonusMin = Math.round(Number(bonus) || 0);

  const activePayments = paymentMethods.filter((p) => p.active);
  const selectedPayment =
    payment || activePayments[0]?.name || "Cash";

  if (!station) return null;
  const session = station.session;
  const rate = rates[station.console] ?? 0;
  const chosenPackage = packages.find((item) => item.id === packageId);
  const sessionTotal = session ? rentalTotal(session, now) + fnbTotal(session) : 0;
  const alreadyPaid = paidTotal(session);
  const dueAmount = Math.max(0, sessionTotal - alreadyPaid);
  const isSettled = dueAmount <= 0;

  const splitRows = splits.map((s) => ({
    method: s.method || activePayments[0]?.name || "Cash",
    amount: Math.max(0, Number(s.amount) || 0),
  }));
  const splitPaid = splitRows.reduce((sum, s) => sum + s.amount, 0);
  const splitRemaining = Math.max(0, dueAmount - splitPaid);
  const cashReceived =
    amountPaid === "" ? dueAmount : Math.max(0, Number(amountPaid) || 0);

  const resetPaymentForm = () => {
    setSplitMode(false);
    setSplits([]);
    setPayment("");
    setAmountPaid("");
  };

  const validatePayment = () => {
    if (dueAmount <= 0) {
      toast.error("Tagihan sudah lunas");
      return false;
    }
    if (splitMode) {
      if (splitRows.filter((s) => s.amount > 0).length === 0) {
        toast.error("Isi jumlah tiap metode pembayaran");
        return false;
      }
      if (splitPaid < dueAmount) {
        toast.error(`Pembayaran masih kurang ${formatRupiah(splitRemaining)}`);
        return false;
      }
      return true;
    }
    if (selectedPayment === "Cash" && cashReceived < dueAmount) {
      toast.error("Uang diterima masih kurang");
      return false;
    }
    return true;
  };

  const handlePay = () => {
    if (splitMode) {
      const rows = splitRows.filter((s) => s.amount > 0);
      settleSession(station.id, {
        payments: rows,
        amount: dueAmount,
        amountPaid: splitPaid,
      });
    } else {
      settleSession(station.id, {
        payment: selectedPayment,
        amount: dueAmount,
        amountPaid: selectedPayment === "Cash" ? cashReceived : dueAmount,
      });
    }
    toast.success("Pembayaran diterima", {
      description: `${formatRupiah(dueAmount)} — ${
        splitMode
          ? splitRows.filter((s) => s.amount > 0).map((s) => s.method).join(" + ")
          : selectedPayment
      }`,
    });
    resetPaymentForm();
  };

  const handleEnd = () => {
    const record = stopSession(station.id);
    if (!record) {
      toast.error("Sesi belum bisa diakhiri", {
        description: `Sisa tagihan ${formatRupiah(dueAmount)} harus dibayar dulu`,
      });
      return;
    }
    onOpenChange(false);
    resetPaymentForm();
    toast.success(`${record.stationName} selesai`, {
      description: `Total ${formatRupiah(record.total)} — ${record.payment}`,
    });
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
            {station.availability !== "available" && (
              <Badge variant="outline" className="w-full justify-center py-2 text-warning">Unit berstatus {station.availability}. Ubah status di Pengaturan terlebih dahulu.</Badge>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="customer-name">Nama pelanggan</Label><Input id="customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Pelanggan umum" /></div>
              <div className="space-y-1.5"><Label htmlFor="customer-phone">Nomor HP</Label><Input id="customer-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="08..." inputMode="tel" /></div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3"><div><p className="text-sm font-medium">Harga member</p><p className="text-xs text-muted-foreground">Tandai pelanggan sebagai member</p></div><Switch checked={member} onCheckedChange={setMember} aria-label="Status member" /></div>
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
                  {consoleTypes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c} — {formatRupiah(rates[c] ?? 0)} / jam
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Bermain per Jam (bayar di muka)</p>
              <Select value={packageId} onValueChange={(value) => { setPackageId(value); const item = packages.find((entry) => entry.id === value); if (item) setDuration(item.durationMin); }}>
                <SelectTrigger><SelectValue placeholder="Pilih paket rental" /></SelectTrigger>
                <SelectContent>{packages.filter((item) => item.active).map((item) => <SelectItem key={item.id} value={item.id}>{item.name} — {item.durationMin} menit</SelectItem>)}</SelectContent>
              </Select>
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
              <div className="space-y-1.5 rounded-md border border-border p-3">
                <Label htmlFor="bonus-min">Waktu ekstra (menit, boleh minus)</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setBonus(String(bonusMin - 1))}>-1</Button>
                  <Input id="bonus-min" type="number" className="h-8 w-24 text-center" value={bonus} onChange={(e) => setBonus(e.target.value)} />
                  <Button type="button" size="sm" variant="outline" onClick={() => setBonus(String(bonusMin + 1))}>+1</Button>
                  {[2, 3, 5].map((m) => (
                    <Button key={m} type="button" size="sm" variant="ghost" onClick={() => setBonus(String(m))}>+{m}</Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Total waktu main: {Math.max(0, duration + bonusMin)} menit — tarif tetap dihitung {duration} menit.</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Harga paket: {formatRupiah((rate * duration) / 60)}
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  startSession(station.id, "prepaid", duration, { customerName, customerPhone, member, packageName: chosenPackage?.name || `${duration} Menit`, notes, bonusMin });
                  toast.success(`${station.name} mulai ${Math.max(0, duration + bonusMin)} menit`, bonusMin !== 0 ? { description: `${duration} menit + ekstra ${bonusMin} menit (tarif tetap)` } : undefined);
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
                startSession(station.id, "open", 0, { customerName, customerPhone, member, packageName: "Open Time", notes });
                toast.success(`${station.name} mulai Main Sepuasnya`);
              }}
            >
              <InfinityIcon className="size-4" /> Mulai Main Sepuasnya
            </Button>
            <div className="space-y-1.5"><Label htmlFor="rental-notes">Catatan</Label><Input id="rental-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Permintaan pelanggan (opsional)" /></div>
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
              <p className="mt-2 text-sm text-muted-foreground">{session.customerName || "Pelanggan Umum"} · {session.packageName}</p>
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

            {session.mode === "prepaid" && (
              <div className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Waktu ekstra (tanpa biaya)</p>
                  <span className="text-sm text-accent">{(session.bonusMin ?? 0) >= 0 ? "+" : ""}{session.bonusMin ?? 0} mnt</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[-5, -3, -1, 1, 2, 3, 5].map((m) => (
                    <Button
                      key={m}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        adjustBonusTime(station.id, m);
                        toast.success(`Waktu ekstra ${m > 0 ? "+" : ""}${m} menit`, { description: "Tarif tidak berubah" });
                      }}
                    >
                      {m > 0 ? `+${m}` : m}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Paket {session.durationMin} menit — total main {Math.max(0, session.durationMin + (session.bonusMin ?? 0))} menit.</p>
              </div>
            )}

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

            {!splitMode && selectedPayment === "Cash" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="amount-paid">Uang diterima</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    onClick={() => setAmountPaid("")}
                  >
                    Uang pas
                  </button>
                </div>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="amount-paid"
                    className="pl-9"
                    type="number"
                    min={0}
                    value={amountPaid === "" ? String(sessionTotal) : amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kembalian</span>
                  <span className="font-semibold text-accent">
                    {formatRupiah(
                      Math.max(
                        0,
                        (amountPaid === "" ? sessionTotal : Number(amountPaid)) -
                          sessionTotal,
                      ),
                    )}
                  </span>
                </div>
              </div>
            )}

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

            {!isSettled && (
            <div className="space-y-2">

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Tipe pembayaran</p>
                {activePayments.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-primary underline-offset-2 hover:underline"
                    onClick={() => {
                      if (splitMode) {
                        setSplitMode(false);
                        setSplits([]);
                      } else {
                        setSplitMode(true);
                        setSplits([
                          { method: activePayments[0]?.name ?? "Cash", amount: String(dueAmount) },
                          { method: activePayments[1]?.name ?? "QRIS", amount: "0" },
                        ]);
                      }
                    }}
                  >
                    {splitMode ? "Satu metode saja" : "Bagi beberapa metode"}
                  </button>
                )}
              </div>
              {activePayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada tipe pembayaran aktif. Atur di menu Pembayaran.
                </p>
              ) : splitMode ? (
                <div className="space-y-2">
                  {splits.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select
                        value={row.method || activePayments[0]?.name || "Cash"}
                        onValueChange={(v) =>
                          setSplits((prev) =>
                            prev.map((r, idx) => (idx === i ? { ...r, method: v } : r)),
                          )
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {activePayments.map((p) => (
                            <SelectItem key={p.id} value={p.name}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        className="flex-1"
                        value={row.amount}
                        aria-label={`Jumlah ${row.method}`}
                        onChange={(e) =>
                          setSplits((prev) =>
                            prev.map((r, idx) =>
                              idx === i ? { ...r, amount: e.target.value } : r,
                            ),
                          )
                        }
                      />
                      {splits.length > 2 && (
                        <button
                          type="button"
                          aria-label="Hapus metode"
                          className="text-muted-foreground transition-colors hover:text-destructive"
                          onClick={() =>
                            setSplits((prev) => prev.filter((_, idx) => idx !== i))
                          }
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSplits((prev) => [
                          ...prev,
                          {
                            method: activePayments[0]?.name ?? "Cash",
                            amount: String(splitRemaining),
                          },
                        ])
                      }
                    >
                      <Plus className="size-4" /> Metode lain
                    </Button>
                    <span
                      className={
                        splitRemaining > 0
                          ? "font-semibold text-destructive"
                          : "font-semibold text-accent"
                      }
                    >
                      {splitRemaining > 0
                        ? `Kurang ${formatRupiah(splitRemaining)}`
                        : `Kembalian ${formatRupiah(splitPaid - dueAmount)}`}
                    </span>
                  </div>
                </div>
              ) : (
                <Select
                  value={selectedPayment}
                  onValueChange={(v) => setPayment(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activePayments.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            )}


            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                className="w-full"
                disabled={isSettled || activePayments.length === 0}
                onClick={() => {
                  if (validatePayment()) setConfirmPay(true);
                }}
              >
                <Wallet className="size-4" />
                {isSettled ? "Sudah Lunas" : `Bayar ${formatRupiah(dueAmount)}`}
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                disabled={!isSettled}
                onClick={() => setConfirmEnd(true)}
              >
                <Square className="size-4" /> Akhiri Sesi
              </Button>
            </div>
            {!isSettled && (
              <p className="text-center text-xs text-muted-foreground">
                Sesi hanya bisa diakhiri setelah seluruh tagihan lunas.
              </p>
            )}

            <AlertDialog open={confirmPay} onOpenChange={setConfirmPay}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Selesaikan pembayaran?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {station.name} — {formatRupiah(dueAmount)} melalui{" "}
                    {splitMode
                      ? splitRows.filter((s) => s.amount > 0).map((s) => s.method).join(" + ") ||
                        "gabungan"
                      : selectedPayment}
                    . Sesi rental tetap berjalan setelah pembayaran.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePay}>Ya, terima pembayaran</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Akhiri sesi rental?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {station.name} akan dikosongkan dan transaksi masuk ke riwayat. Tindakan ini
                    tidak bisa dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEnd}>Ya, akhiri sesi</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
