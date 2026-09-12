import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReceiptView } from "@/components/CustomerDetail";
import { isAdminLevel, useAuth } from "@/lib/auth";
import { formatRupiah, useBilling, type HistoryRecord } from "@/lib/billing-store";

export const Route = createFileRoute("/_authenticated/laporan")({
  head: () => ({
    meta: [
      { title: "Riwayat & Laporan — RentalPro" },
      {
        name: "description",
        content:
          "Rekap pendapatan harian rental PlayStation dan penjualan makanan minuman beserta riwayat transaksi.",
      },
      { property: "og:title", content: "Riwayat & Laporan — RentalPro" },
      {
        property: "og:description",
        content: "Rekap pendapatan harian rental dan penjualan kasir.",
      },
    ],
  }),
  component: LaporanPage,
});

function dayKey(ts: number) {
  return new Date(ts).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeOf(ts: number) {
  return new Date(ts).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LaporanPage() {
  const { history, cashEntries, clearHistory } = useBilling();
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = history.find((h) => h.id === openId) ?? null;
  const todayKey = dayKey(Date.now());
  const today = history.filter((h) => dayKey(h.endAt) === todayKey);
  const cashToday = cashEntries.filter((e) => dayKey(e.createdAt) === todayKey);
  const cashSum = (pick: (e: (typeof cashEntries)[number]) => boolean) =>
    cashToday.filter(pick).reduce((s, e) => s + e.amount, 0);
  const otherIncome = cashSum((e) => e.direction === "in" && !e.payout);
  const expense = cashSum((e) => e.direction === "out" && !e.payout);
  const payoutIn = cashSum((e) => e.direction === "in" && e.payout);
  const payoutOut = cashSum((e) => e.direction === "out" && e.payout);

  const sum = (arr: typeof history, key: "rentalTotal" | "fnbTotal" | "total") =>
    arr.reduce((s, h) => s + h[key], 0);


  const groups = history.reduce<Record<string, typeof history>>((acc, h) => {
    const k = dayKey(h.endAt);
    (acc[k] ||= []).push(h);
    return acc;
  }, {});

  const exportCsv = () => {
    const header = ["Tanggal", "TV", "Pelanggan", "Paket", "Pembayaran", "Durasi", "Rental", "F&B", "Total"];
    const rows = history.map((h) => [new Date(h.endAt).toLocaleString("id-ID"), h.stationName, h.customerName ?? "Umum", h.packageName ?? h.mode, h.payment ?? "Cash", h.minutes, h.rentalTotal, h.fnbTotal, h.total]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `laporan-ps-rental-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Riwayat &amp; Laporan</h1>
          <p className="mt-1 text-muted-foreground">
            Rekap pendapatan dari sesi rental dan penjualan kasir.
          </p>
        </div>
        {history.length > 0 && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Cetak</Button><Button variant="outline" onClick={exportCsv}><Download className="size-4" /> Ekspor CSV</Button><Button variant="outline" onClick={clearHistory}><Trash2 className="size-4" /> Hapus riwayat</Button></div>}
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Rental hari ini" value={formatRupiah(sum(today, "rentalTotal"))} />
        <Stat label="Makanan & minuman" value={formatRupiah(sum(today, "fnbTotal"))} />
        <Stat label="Pendapatan lain" value={formatRupiah(otherIncome)} />
        <Stat label="Pengeluaran" value={formatRupiah(expense)} />
        <Stat
          label="Total pendapatan hari ini"
          value={formatRupiah(sum(today, "total") + otherIncome)}
        />
        <Stat
          label="Sisa bersih hari ini"
          value={formatRupiah(sum(today, "total") + otherIncome - expense)}
          highlight
        />
      </section>

      {(payoutIn > 0 || payoutOut > 0) && (
        <p className="text-sm text-muted-foreground">
          Perpindahan uang kas hari ini (tidak dihitung pendapatan/biaya): masuk{" "}
          {formatRupiah(payoutIn)} · keluar {formatRupiah(payoutOut)}.
        </p>
      )}

      {cashToday.length > 0 && (
        <section className="surface-panel overflow-x-auto p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">Kas lain &amp; pengeluaran hari ini</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Kelompok</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashToday.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.categoryName}</TableCell>
                  <TableCell>{e.group}</TableCell>
                  <TableCell>
                    {e.payout
                      ? e.direction === "in"
                        ? "Kas masuk"
                        : "Kas keluar"
                      : e.direction === "in"
                        ? "Pendapatan"
                        : "Pengeluaran"}
                  </TableCell>
                  <TableCell>{e.payment}</TableCell>
                  <TableCell>{e.note || "-"}</TableCell>
                  <TableCell
                    className={
                      e.direction === "in"
                        ? "text-right font-semibold text-accent"
                        : "text-right font-semibold text-destructive"
                    }
                  >
                    {e.direction === "in" ? "+" : "-"}
                    {formatRupiah(e.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {history.length === 0 ? (
        <p className="surface-panel p-10 text-center text-muted-foreground">
          Belum ada transaksi. Akhiri sebuah sesi di Dashboard untuk mencatatnya di
          sini.
        </p>
      ) : (
        Object.entries(groups).map(([day, records]) => (
          <section key={day} className="surface-panel overflow-x-auto p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{day}</h2>
              <Badge variant="outline" className="border-accent text-accent">
                {formatRupiah(sum(records, "total"))}
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jam</TableHead>
                  <TableHead>TV</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead className="text-right">Durasi</TableHead>
                  <TableHead className="text-right">Rental</TableHead>
                  <TableHead className="text-right">F&amp;B</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="whitespace-nowrap">
                      {timeOf(h.startAt)} – {timeOf(h.endAt)}
                    </TableCell>
                    <TableCell>
                      {h.stationName}{" "}
                      <span className="text-muted-foreground">({h.console})</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{h.customerName ?? "Umum"}<span className="block text-xs text-muted-foreground">{h.packageName ?? "-"}</span></TableCell>
                    <TableCell>
                      {h.mode === "open" ? "Sepuasnya" : "Per Jam"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {h.payment ?? "Cash"}
                    </TableCell>
                    <TableCell className="text-right">{h.minutes} mnt</TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(h.rentalTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(h.fnbTotal)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatRupiah(h.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setOpenId(h.id)}>
                        <Receipt className="size-4" /> Buka
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        ))
      )}

      {selected && (
        <ReceiptDialog
          record={selected}
          open={Boolean(openId)}
          onOpenChange={(value) => setOpenId(value ? openId : null)}
        />
      )}
    </div>
  );
}

function ReceiptDialog({
  record,
  open,
  onOpenChange,
}: {
  record: HistoryRecord;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const { paymentMethods, updateHistoryPayment, removeHistory } = useBilling();
  const { role } = useAuth();
  const canDelete = isAdminLevel(role);
  const [method, setMethod] = useState(record.payment ?? "Cash");
  const [confirm, setConfirm] = useState(false);
  const options = paymentMethods.filter((p) => p.active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nota transaksi</DialogTitle>
        </DialogHeader>

        <ReceiptView record={record} />

        <div className="space-y-2">
          <p className="text-sm font-semibold">Ubah metode pembayaran</p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Pilih metode" />
              </SelectTrigger>
              <SelectContent>
                {options.map((item) => (
                  <SelectItem key={item.id} value={item.name}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                updateHistoryPayment(record.id, { payment: method, payments: [] });
                toast.success("Metode pembayaran diperbarui");
              }}
            >
              Simpan
            </Button>
            {canDelete && (
              <Button variant="destructive" onClick={() => setConfirm(true)}>
                <Trash2 className="size-4" /> Hapus nota
              </Button>
            )}
          </div>
          {record.payments && record.payments.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Nota ini dibayar dengan beberapa metode. Menyimpan metode tunggal akan
              menggantikan rincian tersebut.
            </p>
          )}
          {!canDelete && (
            <p className="text-xs text-muted-foreground">
              Hanya admin yang dapat menghapus nota.
            </p>
          )}
        </div>

        <AlertDialog open={confirm} onOpenChange={setConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus nota ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Nota akan dihapus dari riwayat dan laporan. Tindakan ini tidak bisa
                dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  removeHistory(record.id);
                  setConfirm(false);
                  onOpenChange(false);
                  toast.success("Nota dihapus");
                }}
              >
                Ya, hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="surface-panel p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={
          highlight
            ? "font-display text-2xl font-bold text-accent"
            : "font-display text-2xl font-bold"
        }
      >
        {value}
      </p>
    </div>
  );
}
