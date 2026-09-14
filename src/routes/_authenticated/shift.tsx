import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, LogIn, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah, shiftSummary, useBilling } from "@/lib/billing-store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/shift")({
  head: () => ({
    meta: [
      { title: "Shift Kasir — Check-in & Close Out" },
      {
        name: "description",
        content:
          "Check-in sebelum mulai shift kasir untuk melihat uang kas yang harus ada di laci, lalu isi form close out saat menutup kasir.",
      },
      { property: "og:title", content: "Shift Kasir — Check-in & Close Out" },
      {
        property: "og:description",
        content:
          "Kelola pembukaan shift kasir dan hitung selisih uang laci saat tutup kasir.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShiftPage,
});

function clock(ts?: number) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ShiftPage() {
  const { shifts, history, cashEntries, now, openShift, closeShift } = useBilling();
  const { fullName, user, role } = useAuth();

  const active = shifts.find((s) => !s.closedAt) ?? null;
  const lastClosed = shifts.find((s) => s.closedAt) ?? null;
  const suggestedStart = lastClosed?.nextStartCash ?? 0;

  const cashierName = fullName.trim() || user?.email || "Kasir";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Shift Kasir</h1>
      </header>

      {active ? (
        <CloseOutForm
          shift={active}
          summary={shiftSummary(active, history, cashEntries, now)}
          onClose={closeShift}
        />
      ) : (
        <CheckInCard
          cashierName={cashierName}
          role={role ?? "kasir"}
          suggested={suggestedStart}
          lastClosedAt={lastClosed?.closedAt}
          onOpen={(startCash) => {
            const row = openShift({
              cashierName,
              ...(user?.id ? { cashierId: user.id } : {}),
              startCash,
            });
            if (!row) {
              toast.error("Check-in gagal, masih ada shift yang belum ditutup");
              return;
            }
            toast.success(`Shift ${row.cashierName} dimulai`);
          }}
        />
      )}

      <section className="surface-panel overflow-x-auto p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">Riwayat shift</h2>
        {shifts.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Belum ada shift yang dicatat.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kasir</TableHead>
                <TableHead>Opening</TableHead>
                <TableHead>Closing</TableHead>
                <TableHead className="text-right">Start cash</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Selisih</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((s) => {
                const sum = shiftSummary(s, history, cashEntries, now);
                const actual = s.cashActual ?? 0;
                const diff = s.closedAt ? actual - sum.expected : 0;
                return (
                  <TableRow key={s.id}>
                    <TableCell>{s.cashierName}</TableCell>
                    <TableCell className="whitespace-nowrap">{clock(s.openedAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {s.closedAt ? (
                        clock(s.closedAt)
                      ) : (
                        <Badge variant="secondary">Sedang bertugas</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatRupiah(s.startCash)}</TableCell>
                    <TableCell className="text-right">{formatRupiah(sum.expected)}</TableCell>
                    <TableCell className="text-right">
                      {s.closedAt ? formatRupiah(actual) : "-"}
                    </TableCell>
                    <TableCell
                      className={
                        diff === 0
                          ? "text-right"
                          : diff > 0
                            ? "text-right font-semibold text-accent"
                            : "text-right font-semibold text-destructive"
                      }
                    >
                      {s.closedAt ? formatRupiah(diff) : "-"}
                    </TableCell>
                    <TableCell className="max-w-48 truncate">
                      {s.balanceNote || "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function CheckInCard({
  cashierName,
  role,
  suggested,
  lastClosedAt,
  onOpen,
}: {
  cashierName: string;
  role: string;
  suggested: number;
  lastClosedAt?: number | undefined;
  onOpen: (startCash: number) => void;
}) {
  const [opened, setOpened] = useState(false);
  const [startCash, setStartCash] = useState(String(suggested));

  return (
    <section className="surface-panel space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <LogIn className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Check-in shift</h2>
      </div>

      {!opened ? (
        <>
          <p className="text-sm text-muted-foreground">
            Klik check-in untuk melihat uang kas yang seharusnya tersedia di laci.
          </p>
          <Button onClick={() => setOpened(true)}>
            <ClipboardCheck className="size-4" /> Check-in
          </Button>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama kasir" value={cashierName} />
            <Field label="Level" value={role} />
            <Field
              label="Uang kas yang harus ada di laci"
              value={formatRupiah(suggested)}
              highlight
            />
            <Field
              label="Ditinggalkan shift sebelumnya"
              value={lastClosedAt ? clock(lastClosedAt) : "Belum ada shift sebelumnya"}
            />
          </div>

          <div className="space-y-1.5 sm:max-w-xs">
            <label className="text-sm font-medium" htmlFor="start-cash">
              Uang kas awal (hitung fisik)
            </label>
            <Input
              id="start-cash"
              type="number"
              min={0}
              value={startCash}
              onChange={(e) => setStartCash(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                const value = Number(startCash);
                if (!Number.isFinite(value) || value < 0) {
                  toast.error("Isi jumlah uang kas awal");
                  return;
                }
                onOpen(value);
              }}
            >
              <Wallet className="size-4" /> Mulai shift
            </Button>
            <Button variant="ghost" onClick={() => setOpened(false)}>
              Batal
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function CloseOutForm({
  shift,
  summary,
  onClose,
}: {
  shift: import("@/lib/billing-store").CashShift;
  summary: import("@/lib/billing-store").ShiftSummary;
  onClose: (
    id: string,
    input: { cashActual: number; balanceNote?: string; nextStartCash?: number },
  ) => unknown;
}) {
  const [actual, setActual] = useState("");
  const [note, setNote] = useState("");
  const [nextStart, setNextStart] = useState(String(shift.startCash));

  const actualValue = Number(actual);
  const balance = useMemo(
    () => (Number.isFinite(actualValue) ? actualValue - summary.expected : 0),
    [actualValue, summary.expected],
  );

  return (
    <section className="surface-panel space-y-5 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Cash close out</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Nama kasir" value={shift.cashierName} />
        <Field label="Opening kasir" value={clock(shift.openedAt)} />
        <Field label="Closing kasir" value={clock(Date.now())} />
        <Field label="Start cash" value={formatRupiah(shift.startCash)} />
        <Field label="Paid in" value={formatRupiah(summary.paidIn)} />
        <Field label="Paid out" value={formatRupiah(summary.paidOut)} />
        <Field label="Cash from sales" value={formatRupiah(summary.sales)} />
        <Field label="Expenses" value={formatRupiah(summary.expenses)} />
        <Field label="Cash expected" value={formatRupiah(summary.expected)} highlight />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="cash-actual">
            Cash actual (hitung fisik laci)
          </label>
          <Input
            id="cash-actual"
            type="number"
            min={0}
            value={actual}
            placeholder="0"
            onChange={(e) => setActual(e.target.value)}
          />
        </div>
        <Field
          label="Balance cash (actual - expected)"
          value={formatRupiah(balance)}
          tone={balance === 0 ? undefined : balance > 0 ? "accent" : "danger"}
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="balance-note">
            Balance note
          </label>
          <Input
            id="balance-note"
            value={note}
            placeholder="Alasan selisih uang"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="next-start">
            Next start cash
          </label>
          <Input
            id="next-start"
            type="number"
            min={0}
            value={nextStart}
            onChange={(e) => setNextStart(e.target.value)}
          />
        </div>
      </div>

      <Button
        onClick={() => {
          if (!actual.trim() || !Number.isFinite(actualValue) || actualValue < 0) {
            toast.error("Isi jumlah cash actual di laci");
            return;
          }
          if (balance !== 0 && !note.trim()) {
            toast.error("Ada selisih uang, isi balance note dulu");
            return;
          }
          const next = Number(nextStart);
          const row = onClose(shift.id, {
            cashActual: actualValue,
            balanceNote: note,
            nextStartCash: Number.isFinite(next) ? next : 0,
          });
          if (!row) {
            toast.error("Close out gagal");
            return;
          }
          setActual("");
          setNote("");
          toast.success(`Shift ${shift.cashierName} ditutup`);
        }}
      >
        Close out
      </Button>
    </section>
  );
}

function Field({
  label,
  value,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "accent" | "danger" | undefined;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2.5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={
          tone === "accent"
            ? "font-display text-lg font-semibold text-accent"
            : tone === "danger"
              ? "font-display text-lg font-semibold text-destructive"
              : highlight
                ? "font-display text-lg font-semibold text-primary"
                : "font-display text-lg font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}
