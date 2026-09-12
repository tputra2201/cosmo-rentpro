import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownCircle, ArrowUpCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  formatRupiah,
  useBilling,
  type CashDirection,
  type CashEntry,
} from "@/lib/billing-store";

export const Route = createFileRoute("/_authenticated/kas")({
  head: () => ({
    meta: [
      { title: "Kas Lain & Pengeluaran — RentalPro" },
      {
        name: "description",
        content:
          "Catat pendapatan lain, pengeluaran operasional, serta setoran dan pengambilan uang kas owner yang tidak dihitung sebagai untung atau biaya.",
      },
      { property: "og:title", content: "Kas Lain & Pengeluaran — RentalPro" },
      {
        property: "og:description",
        content:
          "Pemasukan lain, biaya operasional, dan perpindahan uang kas dalam satu halaman.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KasPage,
});

function timeOf(ts: number) {
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function KasPage() {
  const { cashEntries, removeCashEntry } = useBilling();

  const todayKey = new Date().toDateString();
  const today = cashEntries.filter(
    (e) => new Date(e.createdAt).toDateString() === todayKey,
  );
  const sum = (rows: CashEntry[], pick: (e: CashEntry) => boolean) =>
    rows.filter(pick).reduce((s, e) => s + e.amount, 0);

  const incomeToday = sum(today, (e) => e.direction === "in" && !e.payout);
  const expenseToday = sum(today, (e) => e.direction === "out" && !e.payout);
  const payoutIn = sum(today, (e) => e.direction === "in" && e.payout);
  const payoutOut = sum(today, (e) => e.direction === "out" && e.payout);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Kas Lain &amp; Pengeluaran</h1>
        <p className="mt-1 text-muted-foreground">
          Catat pemasukan selain rental dan kafe, biaya operasional, serta uang kas
          owner yang tidak dihitung untung maupun biaya.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pendapatan lain hari ini" value={formatRupiah(incomeToday)} tone="accent" />
        <Stat label="Pengeluaran hari ini" value={formatRupiah(expenseToday)} tone="danger" />
        <Stat label="Kas masuk (bukan pendapatan)" value={formatRupiah(payoutIn)} />
        <Stat label="Kas keluar (bukan biaya)" value={formatRupiah(payoutOut)} />
      </section>

      <Tabs defaultValue="in">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="in">Uang masuk</TabsTrigger>
          <TabsTrigger value="out">Uang keluar</TabsTrigger>
          <TabsTrigger value="kategori">Item &amp; kelompok</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="in" className="mt-4">
          <EntryForm direction="in" />
        </TabsContent>
        <TabsContent value="out" className="mt-4">
          <EntryForm direction="out" />
        </TabsContent>

        <TabsContent value="kategori" className="mt-4 space-y-6">
          <CategoryEditor direction="in" />
          <CategoryEditor direction="out" />
        </TabsContent>

        <TabsContent value="riwayat" className="mt-4">
          <section className="surface-panel overflow-x-auto p-4 sm:p-6">
            {cashEntries.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Belum ada catatan kas.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Kelompok</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashEntries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap">{timeOf(e.createdAt)}</TableCell>
                      <TableCell>{e.categoryName}</TableCell>
                      <TableCell>{e.group}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {e.payout
                            ? e.direction === "in"
                              ? "Kas masuk"
                              : "Kas keluar"
                            : e.direction === "in"
                              ? "Pendapatan"
                              : "Pengeluaran"}
                        </Badge>
                      </TableCell>
                      <TableCell>{e.payment}</TableCell>
                      <TableCell className="max-w-48 truncate">{e.note || "-"}</TableCell>
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
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Hapus catatan"
                          onClick={() => {
                            removeCashEntry(e.id);
                            toast.success("Catatan kas dihapus");
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EntryForm({ direction }: { direction: CashDirection }) {
  const { cashCategories, paymentMethods, addCashEntry } = useBilling();
  const options = cashCategories.filter((c) => c.direction === direction && c.active);
  const [categoryId, setCategoryId] = useState(options[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState("Cash");
  const [note, setNote] = useState("");
  const active = options.find((c) => c.id === categoryId);

  const submit = () => {
    const value = Number(amount);
    if (!categoryId || !Number.isFinite(value) || value <= 0) {
      toast.error("Pilih item dan isi jumlah uang");
      return;
    }
    const row = addCashEntry({ categoryId, amount: value, payment, note });
    if (!row) {
      toast.error("Catatan gagal disimpan");
      return;
    }
    setAmount("");
    setNote("");
    toast.success(
      `${row.categoryName} ${formatRupiah(row.amount)} dicatat`,
    );
  };

  return (
    <section className="surface-panel space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        {direction === "in" ? (
          <ArrowDownCircle className="size-5 text-accent" />
        ) : (
          <ArrowUpCircle className="size-5 text-destructive" />
        )}
        <h2 className="text-lg font-semibold">
          {direction === "in" ? "Catat uang masuk" : "Catat uang keluar"}
        </h2>
      </div>

      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada item. Tambahkan dulu di tab Item &amp; kelompok.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Item</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih item" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor={`kas-amount-${direction}`}>
                Jumlah uang
              </label>
              <Input
                id={`kas-amount-${direction}`}
                type="number"
                min={0}
                value={amount}
                placeholder="0"
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Metode</label>
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih metode" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods
                    .filter((p) => p.active)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor={`kas-note-${direction}`}>
                Catatan
              </label>
              <Input
                id={`kas-note-${direction}`}
                value={note}
                placeholder="Misal: tagihan listrik bulan ini"
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          {active?.payout && (
            <p className="text-sm text-warning">
              Item ini ditandai perpindahan uang kas, jadi tidak dihitung sebagai
              {direction === "in" ? " pendapatan" : " biaya"} di laporan.
            </p>
          )}

          <Button onClick={submit}>
            <Plus className="size-4" /> Simpan catatan
          </Button>
        </>
      )}
    </section>
  );
}

function CategoryEditor({ direction }: { direction: CashDirection }) {
  const { cashCategories, cashEntries, addCashCategory, updateCashCategory, removeCashCategory } =
    useBilling();
  const rows = cashCategories.filter((c) => c.direction === direction);
  const groups = useMemo(
    () => Array.from(new Set(rows.map((c) => c.group))).filter(Boolean),
    [rows],
  );
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [payout, setPayout] = useState(false);

  const add = () => {
    const row = addCashCategory({ name, direction, payout, group });
    if (!row) {
      toast.error("Nama item kosong atau sudah ada");
      return;
    }
    setName("");
    setGroup("");
    setPayout(false);
    toast.success(`${row.name} ditambahkan`);
  };

  return (
    <section className="surface-panel space-y-4 p-4 sm:p-6">
      <h2 className="text-lg font-semibold">
        {direction === "in" ? "Item uang masuk" : "Item uang keluar"}
      </h2>

      <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor={`cat-name-${direction}`}>
            Nama item
          </label>
          <Input
            id={`cat-name-${direction}`}
            value={name}
            placeholder={direction === "in" ? "Misal: Sewa Stik" : "Misal: Pembelian Gas"}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor={`cat-group-${direction}`}>
            Kelompok
          </label>
          <Input
            id={`cat-group-${direction}`}
            value={group}
            placeholder={groups[0] ?? "Operasional"}
            onChange={(e) => setGroup(e.target.value)}
            list={`cat-groups-${direction}`}
          />
          <datalist id={`cat-groups-${direction}`}>
            {groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>
        <Button onClick={add}>
          <Plus className="size-4" /> Tambah
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Switch checked={payout} onCheckedChange={setPayout} />
        Perpindahan uang kas saja (tidak dihitung{" "}
        {direction === "in" ? "pendapatan" : "biaya"})
      </label>

      <ul className="space-y-2">
        {rows.length === 0 && (
          <li className="rounded-md bg-secondary px-3 py-6 text-center text-sm text-muted-foreground">
            Belum ada item.
          </li>
        )}
        {rows.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/50 px-3 py-2.5"
          >
            <Input
              value={c.name}
              className="h-9 min-w-40 flex-1"
              aria-label={`Nama item ${c.name}`}
              onChange={(e) => updateCashCategory(c.id, { name: e.target.value })}
            />
            <Input
              value={c.group}
              className="h-9 w-40"
              aria-label={`Kelompok ${c.name}`}
              onChange={(e) => updateCashCategory(c.id, { group: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch
                checked={c.payout}
                onCheckedChange={(v) => updateCashCategory(c.id, { payout: v })}
                aria-label={`Perpindahan kas ${c.name}`}
              />
              Perpindahan kas
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch
                checked={c.active}
                onCheckedChange={(v) => updateCashCategory(c.id, { active: v })}
                aria-label={`Aktifkan ${c.name}`}
              />
              {c.active ? "Aktif" : "Nonaktif"}
            </label>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Hapus ${c.name}`}
              onClick={() => {
                if (cashEntries.some((e) => e.categoryId === c.id)) {
                  toast.error("Item ini sudah dipakai, nonaktifkan saja");
                  return;
                }
                removeCashCategory(c.id);
                toast.success(`${c.name} dihapus`);
              }}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent" | "danger";
}) {
  return (
    <div className="surface-panel p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={
          tone === "accent"
            ? "font-display text-2xl font-bold text-accent"
            : tone === "danger"
              ? "font-display text-2xl font-bold text-destructive"
              : "font-display text-2xl font-bold"
        }
      >
        {value}
      </p>
    </div>
  );
}
