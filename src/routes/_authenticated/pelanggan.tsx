import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, Crown, History, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cardLabel, formatRupiah, useBilling, type Customer, type CustomerLevel } from "@/lib/billing-store";
import { CustomerDetailDialog, cardsOfCustomer, receiptsOfCustomer } from "@/components/CustomerDetail";
import { SetupHeading, SetupTable, DetailField } from "@/components/SetupTable";

export const Route = createFileRoute("/_authenticated/pelanggan")({
  head: () => ({
    meta: [
      { title: "Pelanggan & Member — RenToPlay" },
      {
        name: "description",
        content: "Kelola pelanggan, member, level, kunjungan, dan poin loyalitas rental PlayStation.",
      },
      { property: "og:title", content: "Pelanggan & Member — RenToPlay" },
      { property: "og:description", content: "Data member, kunjungan, dan poin pelanggan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PelangganPage,
});

function PelangganPage() {
  const {
    customers,
    addCustomer,
    pointsPerRupiah,
    setPointsPerRupiah,
    updateCustomer,
    removeCustomer,
    adjustPoints,
    pointEntries,
    playingCards,
    history,
  } = useBilling();
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [member, setMember] = useState(true);
  const [level, setLevel] = useState<CustomerLevel>("Bronze");
  const [dialogTab, setDialogTab] = useState<"kunjungan" | "kartu">("kunjungan");
  const [dialogCustomer, setDialogCustomer] = useState<Customer | null>(null);

  const visible = customers.filter((item) =>
    `${item.name} ${item.phone}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-neon text-3xl font-extrabold sm:text-4xl">Pelanggan &amp; Member</h1>
      </header>

      <section className="grid gap-6 lg:grid-cols-[330px_1fr]">
        <div className="space-y-6">
          <form
            className="surface-panel space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) {
                toast.error("Nama pelanggan wajib diisi");
                return;
              }
              addCustomer({ name: name.trim(), phone: phone.trim(), member, level });
              setName("");
              setPhone("");
              toast.success("Pelanggan ditambahkan");
            }}
          >
            <h2 className="text-lg font-semibold text-primary">Pelanggan baru</h2>
            <div className="space-y-1.5">
              <Label htmlFor="customer-new-name">Nama</Label>
              <Input id="customer-new-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-new-phone">Nomor HP</Label>
              <Input id="customer-new-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label>Member</Label>
              <Switch checked={member} onCheckedChange={setMember} />
            </div>
            <Select value={level} onValueChange={(value) => setLevel(value as CustomerLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Bronze", "Silver", "Gold"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" type="submit">
              <Plus className="size-4" /> Tambah Pelanggan
            </Button>
          </form>

          <div className="surface-panel space-y-3 p-5">
            <h2 className="text-lg font-semibold text-primary">Aturan poin</h2>
            <Label htmlFor="point-rule">1 poin setiap belanja</Label>
            <Input
              id="point-rule"
              type="number"
              min={1}
              step={1000}
              value={pointsPerRupiah}
              onChange={(e) => setPointsPerRupiah(Number(e.target.value) || 1)}
            />
            <p className="text-sm text-muted-foreground">
              Saat ini: 1 poin / {formatRupiah(pointsPerRupiah)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <SetupHeading
            title="Daftar Pelanggan"
            description="Klik detail untuk melihat kunjungan, kartu, dan poin lengkap."
            right={
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau nomor HP"
                />
              </div>
            }
          />

          <SetupTable<Customer>
            items={visible}
            getId={(c) => c.id}
            getLabel={(c) => c.name}
            emptyText="Belum ada pelanggan yang cocok."
            columns={[
              {
                key: "name",
                header: "Nama",
                render: (c) => (
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.phone || "Tanpa nomor HP"}
                    </p>
                  </div>
                ),
              },
              {
                key: "member",
                header: "Status",
                hideOnMobile: true,
                render: (c) => (
                  <Badge variant={c.member ? "default" : "secondary"}>
                    {c.member ? "Member" : "Umum"}
                  </Badge>
                ),
              },
              {
                key: "level",
                header: "Level",
                hideOnMobile: true,
                render: (c) => (
                  <Badge variant="outline">
                    <Crown className="mr-1 size-3" />
                    {c.level}
                  </Badge>
                ),
              },
              {
                key: "points",
                header: "Poin",
                render: (c) => <span className="font-semibold text-accent">{c.points}</span>,
              },
              {
                key: "spent",
                header: "Belanja",
                hideOnMobile: true,
                render: (c) => formatRupiah(c.totalSpent),
              },
            ]}
            onRemove={(c) => {
              removeCustomer(c.id);
              toast.success(`${c.name} dihapus`);
            }}
            detailTitle={(c) => c.name}
            detailDescription={(c) => c.phone || "Tanpa nomor HP"}
            renderDetail={(customer) => (
              <CustomerDetail
                customer={customer}
                updateCustomer={updateCustomer}
                adjustPoints={adjustPoints}
                pointEntries={pointEntries}
                playingCards={playingCards}
                history={history}
                onOpenDialog={(tab) => {
                  setDialogTab(tab);
                  setDialogCustomer(customer);
                }}
              />
            )}
          />
        </div>
      </section>

      {dialogCustomer && (
        <CustomerDetailDialog
          customer={dialogCustomer}
          open={Boolean(dialogCustomer)}
          onOpenChange={(open) => !open && setDialogCustomer(null)}
          initialTab={dialogTab}
        />
      )}
    </div>
  );
}

function CustomerDetail({
  customer,
  updateCustomer,
  adjustPoints,
  pointEntries,
  playingCards,
  history,
  onOpenDialog,
}: {
  customer: Customer;
  updateCustomer: ReturnType<typeof useBilling>["updateCustomer"];
  adjustPoints: ReturnType<typeof useBilling>["adjustPoints"];
  pointEntries: ReturnType<typeof useBilling>["pointEntries"];
  playingCards: ReturnType<typeof useBilling>["playingCards"];
  history: ReturnType<typeof useBilling>["history"];
  onOpenDialog: (tab: "kunjungan" | "kartu") => void;
}) {
  const cards = cardsOfCustomer(playingCards, customer);
  const receipts = receiptsOfCustomer(history, customer);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Badge variant={customer.member ? "default" : "secondary"}>
          {customer.member ? "Member" : "Umum"}
        </Badge>
        <Badge variant="outline">
          <Crown className="mr-1 size-3" />
          {customer.level}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Poin" value={String(customer.points)} />
        <MiniStat label="Kunjungan" value={String(receipts.length || customer.visits)} />
        <MiniStat label="Belanja" value={formatRupiah(customer.totalSpent)} />
      </div>

      <DetailField label="Level member">
        <div className="flex gap-2">
          <Select
            value={customer.level}
            onValueChange={(value) => updateCustomer(customer.id, { level: value as CustomerLevel })}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Bronze", "Silver", "Gold"].map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => adjustPoints(customer.id, 10, "Bonus manual")}>
            +10 poin
          </Button>
        </div>
      </DetailField>

      <DetailField label="Playing Card">
        {cards.length === 0 ? (
          <p className="rounded-md bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
            Belum punya Playing Card
          </p>
        ) : (
          <ul className="space-y-2">
            {cards.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  onClick={() => onOpenDialog("kartu")}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-secondary/50 px-3 py-2 text-left hover:bg-secondary"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <CreditCard className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-semibold">{cardLabel(card)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs text-muted-foreground">Saldo</span>
                    <span className="font-semibold text-accent">{formatRupiah(card.balance)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DetailField>

      <DetailField
        label="Riwayat"
        hint={`${pointEntries.filter((entry) => entry.customerId === customer.id).length} mutasi poin`}
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => onOpenDialog("kunjungan")}>
            <History className="size-4" /> Riwayat &amp; nota ({receipts.length})
          </Button>
          {cards.length > 0 && (
            <Button variant="outline" onClick={() => onOpenDialog("kartu")}>
              <CreditCard className="size-4" /> Riwayat kartu
            </Button>
          )}
        </div>
      </DetailField>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary/60 p-2">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-semibold">{value}</p>
    </div>
  );
}
