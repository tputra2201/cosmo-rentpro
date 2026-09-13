import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah, useBilling, type CardEntryType } from "@/lib/billing-store";
import { inRange, rangeLabel, type ReportRange } from "@/lib/report-range";

const typeLabels: Record<CardEntryType, string> = {
  purchase: "Penjualan kartu",
  topup: "Top-up saldo",
  payment: "Pemakaian saldo",
  adjust: "Penyesuaian",
};

export function CardReport({ range }: { range: ReportRange }) {
  const { cardEntries, playingCards } = useBilling();
  const entries = [...cardEntries]
    .filter((e) => inRange(e.createdAt, range))
    .sort((a, b) => b.createdAt - a.createdAt);

  const sumOf = (type: CardEntryType) =>
    entries.filter((e) => e.type === type).reduce((s, e) => s + Math.abs(e.amount), 0);
  const countOf = (type: CardEntryType) => entries.filter((e) => e.type === type).length;

  const cardOwner = (cardId: string) => {
    const card = playingCards.find((c) => c.id === cardId);
    return card?.customerName || "-";
  };

  const totalBalance = playingCards.reduce((s, c) => s + c.balance, 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Periode {rangeLabel(range)}</p>

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
          label="Saldo tersimpan semua kartu"
          value={formatRupiah(totalBalance)}
          note={`${playingCards.length} kartu terdaftar`}
        />
      </section>

      <section className="surface-panel overflow-x-auto p-4 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold">Detail transaksi kartu</h3>
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
