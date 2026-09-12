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
  const { history, clearHistory } = useBilling();
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = history.find((h) => h.id === openId) ?? null;
  const todayKey = dayKey(Date.now());
  const today = history.filter((h) => dayKey(h.endAt) === todayKey);

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
        <Stat
          label="Total hari ini"
          value={formatRupiah(sum(today, "total"))}
          highlight
        />
      </section>

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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        ))
      )}
    </div>
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
