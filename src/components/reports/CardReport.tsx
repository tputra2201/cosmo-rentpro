import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cardLabel, formatRupiah, useBilling, type CardEntryType } from "@/lib/billing-store";
import { inRange, rangeLabel, type ReportRange } from "@/lib/report-range";

const ALL = "__all__";

const typeLabels: Record<CardEntryType, string> = {
  purchase: "Penjualan kartu",
  topup: "Top-up saldo",
  payment: "Pemakaian saldo",
  adjust: "Penyesuaian",
};

export function CardReport({ range }: { range: ReportRange }) {
  const { cardEntries, playingCards } = useBilling();
  const [cardId, setCardId] = useState<string>(ALL);

  const inPeriod = [...cardEntries]
    .filter((e) => inRange(e.createdAt, range))
    .sort((a, b) => b.createdAt - a.createdAt);
  const entries = cardId === ALL ? inPeriod : inPeriod.filter((e) => e.cardId === cardId);

  const selected = cardId === ALL ? null : playingCards.find((c) => c.id === cardId) ?? null;

  const sumOf = (type: CardEntryType) =>
    entries.filter((e) => e.type === type).reduce((s, e) => s + Math.abs(e.amount), 0);
  const countOf = (type: CardEntryType) => entries.filter((e) => e.type === type).length;

  const cardOwner = (id: string) => {
    const card = playingCards.find((c) => c.id === id);
    return card?.customerName || "-";
  };

  const scopedCards = cardId === ALL ? playingCards : playingCards.filter((c) => c.id === cardId);
  const totalBalance = scopedCards.reduce((s, c) => s + c.balance, 0);

  const perCard = playingCards
    .map((card) => {
      const list = inPeriod.filter((e) => e.cardId === card.id);
      const total = (type: CardEntryType) =>
        list.filter((e) => e.type === type).reduce((s, e) => s + Math.abs(e.amount), 0);
      return {
        card,
        count: list.length,
        purchase: total("purchase"),
        topup: total("topup"),
        payment: total("payment"),
      };
    })
    .filter((row) => (cardId === ALL ? row.count > 0 : row.card.id === cardId))
    .sort((a, b) => b.topup + b.payment - (a.topup + a.payment));

  return (
    <div className="space-y-6">
      <div className="surface-panel flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Playing Card
          </Label>
          <Select value={cardId} onValueChange={setCardId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Semua kartu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua kartu</SelectItem>
              {playingCards.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {cardLabel(c)}
                  {c.customerName ? ` · ${c.customerName}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="pb-2 text-sm text-muted-foreground">Periode {rangeLabel(range)}</p>
      </div>

      {selected && (
        <div className="surface-panel flex flex-wrap items-center gap-3 p-4">
          <div>
            <p className="text-lg font-semibold">{cardLabel(selected)}</p>
            <p className="text-sm text-muted-foreground">
              {selected.customerName || "Tanpa pemilik"}
            </p>
          </div>
          <Badge variant="outline" className="border-accent text-accent">
            Saldo saat ini {formatRupiah(selected.balance)}
          </Badge>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Penjualan kartu"
          value={formatRupiah(sumOf("purchase"))}
          note={`${countOf("purchase")} kartu terjual`}
        />
        <Stat
          label="Top-up saldo"
          value={formatRupiah(sumOf("topup"))}
          note={`${countOf("topup")} kali top-up`}
        />
        <Stat
          label="Pemakaian saldo"
          value={formatRupiah(sumOf("payment"))}
          note={`${countOf("payment")} transaksi`}
        />
        <Stat
          label={cardId === ALL ? "Saldo tersimpan semua kartu" : "Saldo kartu terpilih"}
          value={formatRupiah(totalBalance)}
          note={`${scopedCards.length} kartu terdaftar`}
        />
      </section>

      <section className="surface-panel overflow-x-auto p-4 sm:p-6">
        <h3 className="mb-4 text-accent text-base font-bold">Ringkasan per kartu</h3>
        {perCard.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada transaksi kartu pada periode ini.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor kartu</TableHead>
                <TableHead>Kode kartu</TableHead>
                <TableHead>Pemilik</TableHead>
                <TableHead className="text-right">Transaksi</TableHead>
                <TableHead className="text-right">Penjualan</TableHead>
                <TableHead className="text-right">Top-up</TableHead>
                <TableHead className="text-right">Pemakaian</TableHead>
                <TableHead className="text-right">Saldo kini</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perCard.map((row) => (
                <TableRow key={row.card.id}>
                  <TableCell>{row.card.cardNumber}</TableCell>
                  <TableCell>{row.card.cardCode?.trim() || "-"}</TableCell>
                  <TableCell>{row.card.customerName || "-"}</TableCell>
                  <TableCell className="text-right">{row.count}</TableCell>
                  <TableCell className="text-right">{formatRupiah(row.purchase)}</TableCell>
                  <TableCell className="text-right">{formatRupiah(row.topup)}</TableCell>
                  <TableCell className="text-right">{formatRupiah(row.payment)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatRupiah(row.card.balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="surface-panel overflow-x-auto p-4 sm:p-6">
        <h3 className="mb-4 text-accent text-base font-bold">Detail transaksi kartu</h3>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada transaksi kartu pada periode ini.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Nomor kartu</TableHead>
                <TableHead>Kode kartu</TableHead>
                <TableHead>Pemilik</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Saldo akhir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>{e.cardNumber}</TableCell>
                  <TableCell>
                    {e.cardCode?.trim() ||
                      playingCards.find((c) => c.id === e.cardId)?.cardCode?.trim() ||
                      "-"}
                  </TableCell>
                  <TableCell>{cardOwner(e.cardId)}</TableCell>
                  <TableCell>{typeLabels[e.type]}</TableCell>
                  <TableCell>{e.note || "-"}</TableCell>
                  <TableCell
                    className={
                      e.amount < 0
                        ? "text-right font-semibold text-destructive"
                        : "text-right font-semibold text-accent"
                    }
                  >
                    {e.amount < 0 ? "-" : "+"}
                    {formatRupiah(Math.abs(e.amount))}
                  </TableCell>
                  <TableCell className="text-right">{formatRupiah(e.balanceAfter)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="surface-panel p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
