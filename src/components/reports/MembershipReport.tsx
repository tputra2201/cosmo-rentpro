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
import { cardLabel, formatRupiah, useBilling, type HistoryRecord } from "@/lib/billing-store";
import { inRange, rangeLabel, type ReportRange } from "@/lib/report-range";

const ALL = "__all__";

function paidTime(h: HistoryRecord) {
  return h.paidAt ?? h.endAt;
}

function timeText(ts: number) {
  return new Date(ts).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MembershipReport({ range }: { range: ReportRange }) {
  const { history, customers, playingCards } = useBilling();
  const [customerId, setCustomerId] = useState<string>(ALL);

  const members = customers.filter((c) => c.member);
  const memberIds = new Set(members.map((c) => c.id));

  const inPeriod = history.filter((h) => inRange(paidTime(h), range));
  const memberTx = inPeriod.filter((h) => h.customerId && memberIds.has(h.customerId));
  const rows = (customerId === ALL ? memberTx : memberTx.filter((h) => h.customerId === customerId))
    .slice()
    .sort((a, b) => paidTime(b) - paidTime(a));

  const selected = customerId === ALL ? null : customers.find((c) => c.id === customerId) ?? null;

  const sum = (arr: HistoryRecord[], key: "rentalTotal" | "fnbTotal" | "total") =>
    arr.reduce((s, h) => s + h[key], 0);
  const discountSum = rows.reduce((s, h) => s + (h.discount ?? 0), 0);
  const pointsSum = rows.reduce((s, h) => s + (h.pointsEarned ?? 0), 0);

  const perMember = members
    .map((c) => {
      const list = memberTx.filter((h) => h.customerId === c.id);
      const card = playingCards.find((p) => p.customerId === c.id);
      return {
        customer: c,
        count: list.length,
        total: list.reduce((s, h) => s + h.total, 0),
        discount: list.reduce((s, h) => s + (h.discount ?? 0), 0),
        points: list.reduce((s, h) => s + (h.pointsEarned ?? 0), 0),
        cardNumber: card ? cardLabel(card) : "",
        cardBalance: card?.balance ?? 0,
      };
    })
    .filter((row) => (customerId === ALL ? row.count > 0 : row.customer.id === customerId))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="surface-panel flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Member</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Semua member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua member</SelectItem>
              {members.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` · ${c.phone}` : ""}
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
            <p className="text-lg font-semibold">{selected.name}</p>
            <p className="text-sm text-muted-foreground">
              {selected.phone || "Tanpa nomor HP"} · Level {selected.level}
            </p>
          </div>
          <Badge variant="outline" className="border-accent text-accent">
            Poin saat ini {selected.points}
          </Badge>
          <Badge variant="outline">Kunjungan {selected.visits}</Badge>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Transaksi member"
          value={String(rows.length)}
          note={customerId === ALL ? `${perMember.length} member aktif` : "member terpilih"}
        />
        <Stat label="Rental" value={formatRupiah(sum(rows, "rentalTotal"))} note="dari member" />
        <Stat label="Makanan & minuman" value={formatRupiah(sum(rows, "fnbTotal"))} note="dari member" />
        <Stat
          label="Total belanja member"
          value={formatRupiah(sum(rows, "total"))}
          note={`Potongan ${formatRupiah(discountSum)} · ${pointsSum} poin`}
        />
      </section>

      <section className="surface-panel overflow-x-auto p-4 sm:p-6">
        <h3 className="mb-4 text-accent text-base font-bold">Ringkasan per member</h3>
        {perMember.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada transaksi member pada periode ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Nomor HP</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Playing Card</TableHead>
                <TableHead className="text-right">Transaksi</TableHead>
                <TableHead className="text-right">Potongan</TableHead>
                <TableHead className="text-right">Poin</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perMember.map((row) => (
                <TableRow key={row.customer.id}>
                  <TableCell>{row.customer.name}</TableCell>
                  <TableCell>{row.customer.phone || "-"}</TableCell>
                  <TableCell>{row.customer.level}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.cardNumber
                      ? `${row.cardNumber} (${formatRupiah(row.cardBalance)})`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">{row.count}</TableCell>
                  <TableCell className="text-right">{formatRupiah(row.discount)}</TableCell>
                  <TableCell className="text-right">{row.points}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatRupiah(row.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="surface-panel overflow-x-auto p-4 sm:p-6">
        <h3 className="mb-4 text-accent text-base font-bold">Detail transaksi</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada transaksi pada periode ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu bayar</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Unit / Meja</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Pembayaran</TableHead>
                <TableHead className="text-right">Rental</TableHead>
                <TableHead className="text-right">F&amp;B</TableHead>
                <TableHead className="text-right">Potongan</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="whitespace-nowrap">{timeText(paidTime(h))}</TableCell>
                  <TableCell>{h.customerName ?? "-"}</TableCell>
                  <TableCell>{h.tableName ?? h.stationName}</TableCell>
                  <TableCell>{h.packageName ?? "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {h.payments?.length
                      ? h.payments.map((p) => p.method).join(" + ")
                      : h.payment ?? "Cash"}
                  </TableCell>
                  <TableCell className="text-right">{formatRupiah(h.rentalTotal)}</TableCell>
                  <TableCell className="text-right">{formatRupiah(h.fnbTotal)}</TableCell>
                  <TableCell className="text-right">{formatRupiah(h.discount ?? 0)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatRupiah(h.total)}
                  </TableCell>
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
