import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CreditCard,
  History,
  Plus,
  Settings2,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { CardScanInput } from "@/components/CardScanInput";
import { CardFundingSelect } from "@/components/CardFundingSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cardDiscountPercentFor,
  findCardByNumber,
  formatRupiah,
  useBilling,
} from "@/lib/billing-store";
import { ShiftLockedNotice, useShiftGate } from "@/components/ShiftGate";
import { SetupHeading, SetupTable, DetailField } from "@/components/SetupTable";

export const Route = createFileRoute("/_authenticated/kartu")({
  head: () => ({
    meta: [
      { title: "Playing Card — RenToPlay" },
      {
        name: "description",
        content:
          "Manajemen Playing Card rental PS: pembelian kartu baru, data pelanggan, top-up saldo, riwayat pemakaian, dan potongan harga khusus.",
      },
      { property: "og:title", content: "Playing Card — RenToPlay" },
      {
        property: "og:description",
        content:
          "Kelola kartu bermain berchip RFID: beli kartu, isi saldo, dan pantau riwayat transaksi tiap kartu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KartuPage,
});

function KartuPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Playing Card</h1>
      </header>

      <ShiftLockedNotice className="mb-3" />
      <Tabs defaultValue="beli">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="beli">
            <Plus className="size-4" /> Kartu Baru
          </TabsTrigger>
          <TabsTrigger value="kartu">
            <CreditCard className="size-4" /> Data &amp; Saldo
          </TabsTrigger>
          <TabsTrigger value="riwayat">
            <History className="size-4" /> Riwayat
          </TabsTrigger>
          <TabsTrigger value="atur">
            <Settings2 className="size-4" /> Pengaturan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="beli" className="mt-4">
          <BuyCardPanel />
        </TabsContent>
        <TabsContent value="kartu" className="mt-4">
          <CardListPanel />
        </TabsContent>
        <TabsContent value="riwayat" className="mt-4">
          <HistoryPanel />
        </TabsContent>
        <TabsContent value="atur" className="mt-4">
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BuyCardPanel() {
  const { playingCards, customers, cardPrice, buyPlayingCard } = useBilling();
  const { requireShift } = useShiftGate();
  const [cardNumber, setCardNumber] = useState("");
  const [cardCode, setCardCode] = useState("");
  const [price, setPrice] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [member, setMember] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [topup, setTopup] = useState("");
  const [payment, setPayment] = useState("Cash");

  const priceValue = price === "" ? cardPrice : Math.max(0, Number(price) || 0);
  const topupValue = Math.max(0, Number(topup) || 0);

  const pickCustomer = (value: string) => {
    setCustomerId(value === "baru" ? "" : value);
    const found = customers.find((c) => c.id === value);
    if (found) {
      setName(found.name);
      setPhone(found.phone);
      setMember(found.member);
    }
  };

  const submit = () => {
    if (!requireShift()) return;
    const number = cardNumber.trim();
    if (!number) {
      toast.error("Nomor kartu belum diisi");
      return;
    }
    if (findCardByNumber(playingCards, number)) {
      toast.error("Nomor kartu itu sudah terdaftar");
      return;
    }
    const uid = cardUid.trim();
    if (uid && findCardByNumber(playingCards, uid)) {
      toast.error("Nomor seri chip itu sudah dipakai kartu lain");
      return;
    }
    const card = buyPlayingCard({
      cardNumber: number,
      cardCode: cardCode.trim(),
      cardUid: uid,
      customerName: name,
      customerPhone: phone,
      member,
      topup: topupValue,
      price: priceValue,
      payment,
      ...(customerId ? { customerId } : {}),
    });
    if (!card) {
      toast.error("Kartu gagal dibuat");
      return;
    }
    toast.success(`Kartu ${card.cardNumber} terdaftar`, {
      description: `Harga kartu ${formatRupiah(priceValue)} · saldo awal ${formatRupiah(topupValue)} · dibayar ${payment}`,
    });
    setCardNumber("");
    setCardCode("");
    setCardUid("");
    setName("");
    setPhone("");
    setMember(false);
    setCustomerId("");
    setTopup("");
    setPayment("Cash");

    setPrice("");
  };

  return (
    <section className="surface-panel space-y-4 p-4 sm:p-6">
      <SetupHeading title="Pembelian Kartu Baru" description="Daftarkan kartu baru beserta pemegang dan saldo awal." />
      <CardScanInput value={cardNumber} onChange={setCardNumber} autoFocus />

      <div className="space-y-1.5">
        <Label htmlFor="card-code">Kode Kartu</Label>
        <Input
          id="card-code"
          value={cardCode}
          placeholder="Contoh: PC-001A"
          onChange={(e) => setCardCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase())}
        />
        <p className="text-xs text-muted-foreground">
          Huruf dan angka, tercetak di kartu. Muncul di pembayaran, saldo, riwayat, dan laporan.
        </p>
      </div>



      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="card-price">Harga kartu</Label>
          <Input
            id="card-price"
            type="number"
            min={0}
            value={price === "" ? String(cardPrice) : price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="card-topup">Top-up saldo awal</Label>
          <Input
            id="card-topup"
            type="number"
            min={0}
            value={topup}
            placeholder="0"
            onChange={(e) => setTopup(e.target.value)}
          />
        </div>
        <CardFundingSelect id="card-buy-payment" value={payment} onChange={setPayment} />
        <p className="self-end text-sm text-muted-foreground">
          Total dibayar sekarang: {formatRupiah(priceValue + topupValue)}
        </p>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Pelanggan tersimpan</Label>
          <Select value={customerId || "baru"} onValueChange={pickCustomer}>
            <SelectTrigger>
              <SelectValue placeholder="Pelanggan baru" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baru">Pelanggan baru</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="card-name">Nama pelanggan</Label>
          <Input id="card-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="card-phone">Nomor HP</Label>
          <Input id="card-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch id="card-member" checked={member} onCheckedChange={setMember} />
          <Label htmlFor="card-member">Member (dapat potongan khusus)</Label>
        </div>
      </div>

      <Button onClick={submit}>
        <Plus className="size-4" /> Simpan kartu
      </Button>
    </section>
  );
}

function CardListPanel() {
  const {
    playingCards,
    cardEntries,
    cardDiscountPercent,
    cardMemberDiscountPercent,
    topupCard,
    updatePlayingCard,
    removePlayingCard,
  } = useBilling();
  const { requireShift } = useShiftGate();
  const [search, setSearch] = useState("");
  const [topupValues, setTopupValues] = useState<Record<string, string>>({});
  const [payValues, setPayValues] = useState<Record<string, string>>({});

  const key = search.trim().toLowerCase();
  const list = key
    ? playingCards.filter(
        (c) =>
          c.cardNumber.toLowerCase().includes(key) ||
          (c.cardCode ?? "").toLowerCase().includes(key) ||
          (c.cardUid ?? "").toLowerCase().includes(key) ||
          c.customerName.toLowerCase().includes(key) ||
          c.customerPhone.includes(key),
      )
    : playingCards;

  return (
    <section className="surface-panel space-y-4 p-4 sm:p-6">
      <SetupHeading
        title="Data dan Saldo"
        description="Klik tombol detail untuk melihat data lengkap kartu dan riwayat transaksinya."
      />
      <CardScanInput value={search} onChange={setSearch} label="Cari / scan kartu" id="card-search" />

      <SetupTable<(typeof playingCards)[number]>
        items={list}
        getId={(c) => c.id}
        getLabel={(c) => c.cardNumber}
        detailWide
        emptyText="Belum ada kartu yang cocok."
        columns={[
          {
            key: "code",
            header: "Kode Kartu",
            render: (c) => (
              <div className="min-w-0">
                <span className="font-bold text-foreground">{c.cardCode?.trim() || "-"}</span>
                <span className="block text-xs text-muted-foreground">{c.cardNumber}</span>
              </div>
            ),
          },
          {
            key: "holder",
            header: "Nama Pemegang",
            render: (c) => (
              <div className="min-w-0">
                <span className="truncate">{c.customerName || "Umum"}</span>
                {c.customerPhone && (
                  <span className="block text-xs text-muted-foreground">{c.customerPhone}</span>
                )}
              </div>
            ),
          },
          {
            key: "balance",
            header: "Saldo",
            render: (c) => (
              <span className="font-semibold text-accent">{formatRupiah(c.balance)}</span>
            ),
          },
          {
            key: "status",
            header: "Status",
            hideOnMobile: true,
            render: (c) =>
              c.active ? (
                <span className="font-semibold text-accent">Aktif</span>
              ) : (
                <span className="font-semibold text-destructive">Diblokir</span>
              ),
          },
        ]}
        onRemove={(c) => {
          removePlayingCard(c.id);
          toast.success(`Kartu ${c.cardNumber} dihapus`);
        }}
        detailTitle={(c) => `Kartu ${c.cardNumber}`}
        detailDescription={(c) => `Kode: ${c.cardCode?.trim() || "-"}`}
        renderDetail={(card) => {
          const usage = cardEntries.filter((e) => e.cardId === card.id);
          const pct = cardDiscountPercentFor(card, {
            cardDiscountPercent,
            cardMemberDiscountPercent,
          });
          return (
            <>
              <DetailField label="Kode Kartu">
                <Input
                  value={card.cardCode ?? ""}
                  placeholder="Kode Kartu"
                  aria-label={`Kode kartu ${card.cardNumber}`}
                  onChange={(e) =>
                    updatePlayingCard(card.id, {
                      cardCode: e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase(),
                    })
                  }
                />
              </DetailField>
              <DetailField label="Nomor Kartu">
                <p className="text-sm text-muted-foreground">{card.cardNumber}</p>
              </DetailField>

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Nama pemegang">
                  <Input
                    value={card.customerName}
                    aria-label={`Nama pemilik ${card.cardNumber}`}
                    onChange={(e) => updatePlayingCard(card.id, { customerName: e.target.value })}
                  />
                </DetailField>
                <DetailField label="Nomor HP">
                  <Input
                    value={card.customerPhone}
                    aria-label={`Nomor HP ${card.cardNumber}`}
                    onChange={(e) => updatePlayingCard(card.id, { customerPhone: e.target.value })}
                  />
                </DetailField>
              </div>

              <DetailField label="Saldo saat ini">
                <p className="font-display text-xl font-semibold text-accent">
                  {formatRupiah(card.balance)}
                </p>
                <p className="text-xs text-muted-foreground">Potongan berlaku: {pct}%</p>
              </DetailField>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={card.member}
                    onCheckedChange={(v) => updatePlayingCard(card.id, { member: v })}
                    aria-label={`Status member ${card.cardNumber}`}
                  />
                  <span className="text-sm text-muted-foreground">Member</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={card.active}
                    onCheckedChange={(v) => updatePlayingCard(card.id, { active: v })}
                    aria-label={`Kartu aktif ${card.cardNumber}`}
                  />
                  <span className="text-sm text-muted-foreground">
                    {card.active ? "Aktif" : "Diblokir"}
                  </span>
                </div>
              </div>

              <DetailField label="Isi saldo">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-40 flex-1 space-y-1.5">
                    <Label htmlFor={`topup-${card.id}`}>Top-up saldo</Label>
                    <Input
                      id={`topup-${card.id}`}
                      type="number"
                      min={0}
                      placeholder="0"
                      value={topupValues[card.id] ?? ""}
                      onChange={(e) =>
                        setTopupValues((prev) => ({ ...prev, [card.id]: e.target.value }))
                      }
                    />
                  </div>
                  <div className="min-w-40">
                    <CardFundingSelect
                      id={`topup-pay-${card.id}`}
                      value={payValues[card.id] ?? "Cash"}
                      onChange={(value) =>
                        setPayValues((prev) => ({ ...prev, [card.id]: value }))
                      }
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (!requireShift()) return;
                      const amount = Math.max(0, Number(topupValues[card.id] ?? "") || 0);
                      const method = payValues[card.id] ?? "Cash";
                      if (!topupCard(card.id, amount, "Top-up saldo", method)) {
                        toast.error("Jumlah top-up harus lebih dari 0");
                        return;
                      }
                      setTopupValues((prev) => ({ ...prev, [card.id]: "" }));
                      toast.success(`Saldo ditambah ${formatRupiah(amount)} · ${method}`);
                    }}
                  >
                    <Wallet className="size-4" /> Isi saldo
                  </Button>
                </div>
              </DetailField>

              <DetailField label="Riwayat transaksi (pembelian, top up, pemakaian)">
                {usage.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada transaksi untuk kartu ini.</p>
                ) : (
                  <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border p-3 text-sm">
                    {usage.map((entry) => (
                      <li key={entry.id} className="flex justify-between gap-3">
                        <span className="truncate text-muted-foreground">
                          {TYPE_LABEL[entry.type] ?? entry.type} ·{" "}
                          {new Date(entry.createdAt).toLocaleString("id-ID")} · {entry.note}
                        </span>
                        <span
                          className={entry.amount < 0 ? "text-destructive" : "text-accent"}
                        >
                          {entry.amount < 0 ? "-" : "+"}
                          {formatRupiah(Math.abs(entry.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </DetailField>
            </>
          );
        }}
      />
    </section>
  );
}
const TYPE_LABEL: Record<string, string> = {
  purchase: "Pembelian kartu",
  topup: "Top-up",
  payment: "Pembayaran",
  adjust: "Penyesuaian",
};

function HistoryPanel() {
  const { cardEntries, playingCards } = useBilling();
  const [cardId, setCardId] = useState<string>(playingCards[0]?.id ?? "");
  const selectedId = playingCards.some((c) => c.id === cardId) ? cardId : (playingCards[0]?.id ?? "");
  const entries = cardEntries.filter((e) => e.cardId === selectedId);
  return (
    <section className="surface-panel space-y-3 p-4 sm:p-6">
      <SetupHeading title="Riwayat Pemakaian Kartu" description="Lihat riwayat transaksi tiap kartu." />
      {playingCards.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada kartu.</p>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="history-card">Nomor kartu</Label>
          <Select value={selectedId} onValueChange={setCardId}>
            <SelectTrigger id="history-card" className="sm:w-72">
              <SelectValue placeholder="Pilih nomor kartu" />
            </SelectTrigger>
            <SelectContent>
              {playingCards.map((card) => (
                <SelectItem key={card.id} value={card.id}>
                  {card.cardNumber} — {card.customerName || "Tanpa nama"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {playingCards.length === 0 ? null : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada transaksi untuk kartu ini.</p>
      ) : (
        <ul className="space-y-2">
          {entries.slice(0, 200).map((entry) => (

            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
            >
              <span className="min-w-0">
                <span className="font-semibold">{entry.cardNumber}</span> ·{" "}
                {TYPE_LABEL[entry.type] ?? entry.type} · {entry.note}
                <span className="block text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString("id-ID")} · saldo{" "}
                  {formatRupiah(entry.balanceAfter)}
                </span>
              </span>
              <span
                className={
                  entry.amount < 0 ? "font-semibold text-destructive" : "font-semibold text-accent"
                }
              >
                {entry.amount < 0 ? "-" : "+"}
                {formatRupiah(Math.abs(entry.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SettingsPanel() {
  const {
    cardPrice,
    cardDiscountPercent,
    cardMemberDiscountPercent,
    cardUsbReaderMode,
    setCardPrice,
    setCardDiscountPercent,
    setCardMemberDiscountPercent,
    setCardUsbReaderMode,
  } = useBilling();

  return (
    <section className="surface-panel space-y-4 p-4 sm:p-6">
      <SetupHeading title="Pengaturan Playing Card" description="Harga kartu baru dan potongan harga default." />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="set-price">Harga kartu baru</Label>
          <Input
            id="set-price"
            type="number"
            min={0}
            value={cardPrice}
            onChange={(e) => setCardPrice(Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="set-disc">Potongan kartu (%)</Label>
          <Input
            id="set-disc"
            type="number"
            min={0}
            max={100}
            value={cardDiscountPercent}
            onChange={(e) => setCardDiscountPercent(Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="set-disc-member">Potongan member (%)</Label>
          <Input
            id="set-disc-member"
            type="number"
            min={0}
            max={100}
            value={cardMemberDiscountPercent}
            onChange={(e) => setCardMemberDiscountPercent(Number(e.target.value) || 0)}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Potongan dipakai otomatis saat kasir memilih pembayaran Playing Card. Kartu bertanda
        member memakai potongan member.
      </p>
      <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
        <div className="space-y-1">
          <Label htmlFor="set-usb-reader">Mode pembaca USB (keyboard)</Label>
          <p className="text-xs text-muted-foreground">
            Untuk tablet/PC tanpa NFC yang memakai pembaca kartu USB: kolom nomor kartu fokus
            otomatis dan ketikan cepat dari alat langsung terbaca saat panel kartu terbuka.
          </p>
        </div>
        <Switch id="set-usb-reader" checked={cardUsbReaderMode} onCheckedChange={setCardUsbReaderMode} />
      </div>
    </section>
  );
}
