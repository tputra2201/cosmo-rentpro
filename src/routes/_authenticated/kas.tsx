import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownCircle, ArrowUpCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ShiftLockedNotice, useShiftGate } from "@/components/ShiftGate";
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
  type CashCategory,
  type CashDirection,
  type CashEntry,
  type CashGroup,
} from "@/lib/billing-store";
import { SetupHeading, SetupTable, DetailField } from "@/components/SetupTable";

export const Route = createFileRoute("/_authenticated/kas")({
  head: () => ({
    meta: [
      { title: "Kas Lain & Pengeluaran — RenToPlay" },
      {
        name: "description",
        content:
          "Catat pendapatan lain, pengeluaran operasional, serta setoran dan pengambilan uang kas owner yang tidak dihitung sebagai untung atau biaya.",
      },
      { property: "og:title", content: "Kas Lain & Pengeluaran — RenToPlay" },
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
          <TabsTrigger value="kategori">Item &amp; Kategori</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="in" className="mt-4">
          <EntryForm direction="in" />
        </TabsContent>
        <TabsContent value="out" className="mt-4">
          <EntryForm direction="out" />
        </TabsContent>

        <TabsContent value="kategori" className="mt-4 space-y-6">
          <GroupEditor direction="in" />
          <CategoryEditor direction="in" />
          <GroupEditor direction="out" />
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
                    <TableHead>Kategori</TableHead>
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
  const { requireShift } = useShiftGate();
  const options = cashCategories.filter((c) => c.direction === direction && c.active);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((c) => `${c.name} ${c.group}`.toLowerCase().includes(q));
  }, [options, search]);
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
    if (!requireShift()) return;
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

      <ShiftLockedNotice />

      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada item. Tambahkan dulu di tab Item &amp; Kategori.
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor={`kas-search-${direction}`}>
              Cari item
            </label>
            <Input
              id={`kas-search-${direction}`}
              value={search}
              placeholder="Ketik huruf awal nama item…"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Item</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih item" />
                </SelectTrigger>
                <SelectContent>
                  {filtered.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Tidak ada item yang cocok
                    </div>
                  ) : (
                    filtered.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} · {c.group}
                      </SelectItem>
                    ))
                  )}
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

function GroupEditor({ direction }: { direction: CashDirection }) {
  const { cashGroups, cashCategories, addCashGroup, updateCashGroup, removeCashGroup } =
    useBilling();
  const rows = cashGroups.filter((g) => g.direction === direction);
  const [name, setName] = useState("");

  const add = () => {
    const row = addCashGroup({ name, direction });
    if (!row) {
      toast.error("Nama kategori kosong atau sudah ada");
      return;
    }
    setName("");
    toast.success(`Kategori ${row.name} ditambahkan`);
  };

  return (
    <section className="surface-panel space-y-4 p-4 sm:p-6">
      <SetupHeading
        title={direction === "in" ? "Kategori uang masuk" : "Kategori uang keluar"}
        as="h2"
      />

      <SetupTable<CashGroup>
        items={rows}
        getId={(g) => g.id}
        getLabel={(g) => g.name}
        columns={[
          {
            key: "name",
            header: "Nama Kategori",
            render: (g) => <span className="font-bold text-foreground">{g.name}</span>,
          },
          {
            key: "count",
            header: "Jumlah Item",
            render: (g) =>
              cashCategories.filter(
                (c) => c.direction === direction && c.group === g.name,
              ).length,
          },
        ]}
        onRemove={(g) => {
          if (!removeCashGroup(g.id)) {
            toast.error("Kategori ini masih dipakai item, pindahkan itemnya dulu");
            return;
          }
          toast.success(`Kategori ${g.name} dihapus`);
        }}
        detailTitle={(g) => g.name}
        detailDescription={() => "Ubah nama kategori ini."}
        emptyText="Belum ada kategori."
        renderDetail={(g) => (
          <DetailField
            label="Nama kategori"
            hint="Semua item yang memakai kategori ini ikut berubah."
          >
            <Input
              value={g.name}
              aria-label={`Nama kategori ${g.name}`}
              onChange={(e) => updateCashGroup(g.id, { name: e.target.value })}
            />
          </DetailField>
        )}
      />

      <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor={`grp-name-${direction}`}>
            Nama kategori
          </label>
          <Input
            id={`grp-name-${direction}`}
            value={name}
            placeholder={direction === "in" ? "Misal: Pendapatan Lain" : "Misal: Operasional"}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button onClick={add}>
          <Plus className="size-4" /> Tambah kategori
        </Button>
      </div>
    </section>
  );
}

function CategoryEditor({ direction }: { direction: CashDirection }) {
  const {
    cashCategories,
    cashGroups,
    cashEntries,
    addCashCategory,
    updateCashCategory,
    removeCashCategory,
  } = useBilling();
  const rows = cashCategories.filter((c) => c.direction === direction);
  const groups = useMemo(
    () => cashGroups.filter((g) => g.direction === direction && g.active),
    [cashGroups, direction],
  );
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [payout, setPayout] = useState(false);

  const add = () => {
    if (!group) {
      toast.error("Pilih kategori dulu");
      return;
    }
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
      <SetupHeading
        title={direction === "in" ? "Item uang masuk" : "Item uang keluar"}
        as="h2"
      />

      <SetupTable<CashCategory>
        items={rows}
        getId={(c) => c.id}
        getLabel={(c) => c.name}
        columns={[
          {
            key: "name",
            header: "Nama Item",
            render: (c) => <span className="font-bold text-foreground">{c.name}</span>,
          },
          {
            key: "group",
            header: "Kategori",
            hideOnMobile: true,
            render: (c) => c.group || "—",
          },
          {
            key: "payout",
            header: "Perpindahan Kas",
            hideOnMobile: true,
            render: (c) =>
              c.payout ? (
                <span className="text-accent">Ya</span>
              ) : (
                <span className="text-muted-foreground">Tidak</span>
              ),
          },
          {
            key: "active",
            header: "Status",
            render: (c) =>
              c.active ? (
                <span className="font-semibold text-accent">Aktif</span>
              ) : (
                <span className="text-muted-foreground">Nonaktif</span>
              ),
          },
        ]}
        onRemove={(c) => {
          if (cashEntries.some((e) => e.categoryId === c.id)) {
            toast.error("Item ini sudah dipakai, nonaktifkan saja");
            return;
          }
          removeCashCategory(c.id);
          toast.success(`${c.name} dihapus`);
        }}
        detailTitle={(c) => c.name}
        detailDescription={() => "Ubah nama, kategori, dan status item ini."}
        emptyText="Belum ada item."
        renderDetail={(c) => (
          <>
            <DetailField label="Nama item">
              <Input
                value={c.name}
                aria-label={`Nama item ${c.name}`}
                onChange={(e) => updateCashCategory(c.id, { name: e.target.value })}
              />
            </DetailField>
            <DetailField label="Kategori">
              <Select
                value={c.group}
                onValueChange={(v) => updateCashCategory(c.id, { group: v })}
              >
                <SelectTrigger aria-label={`Kategori ${c.name}`}>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.name}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DetailField>
            <DetailField label="Perpindahan uang kas saja" hint={`Tidak dihitung sebagai ${direction === "in" ? "pendapatan" : "biaya"} di laporan.`}>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  checked={c.payout}
                  onCheckedChange={(v) => updateCashCategory(c.id, { payout: v })}
                  aria-label={`Perpindahan kas ${c.name}`}
                />
                Perpindahan kas
              </label>
            </DetailField>
            <DetailField label="Status">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  checked={c.active}
                  onCheckedChange={(v) => updateCashCategory(c.id, { active: v })}
                  aria-label={`Aktifkan ${c.name}`}
                />
                {c.active ? "Aktif" : "Nonaktif"}
              </label>
            </DetailField>
          </>
        )}
      />

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
          <label className="text-sm font-medium">Kategori</label>
          <Select value={group} onValueChange={setGroup} disabled={groups.length === 0}>
            <SelectTrigger aria-label={`Kategori item ${direction}`}>
              <SelectValue
                placeholder={groups.length === 0 ? "Buat kategori dulu" : "Pilih kategori"}
              />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.name}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
