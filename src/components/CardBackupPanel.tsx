import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { DatabaseBackup, Download, RotateCcw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfirm } from "@/components/ConfirmDialog";
import { SetupHeading } from "@/components/SetupTable";
import {
  formatRupiah,
  useBilling,
  type CardBackup,
  type CardEntry,
  type PlayingCard,
} from "@/lib/billing-store";
import { useCan } from "@/lib/use-can";

type Row = Record<string, string | number | boolean | null>;
type RestoreMode = "replace" | "merge";

const CARD_SHEET = "Playing Card";
const ENTRY_SHEET = "Transaksi Kartu";

/** Ubah objek/array menjadi teks agar aman ditulis ke sel Excel. */
function toRows(list: unknown[]): Row[] {
  return list.map((item) => {
    const row: Row = {};
    for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
      row[key] =
        value === null || value === undefined
          ? ""
          : typeof value === "object"
            ? JSON.stringify(value)
            : (value as string | number | boolean);
    }
    return row;
  });
}

/** Kembalikan teks JSON di sel Excel menjadi nilai aslinya. */
function fromRows<T>(rows: Row[]): T[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === "string") {
        const text = value.trim();
        if (
          (text.startsWith("{") && text.endsWith("}")) ||
          (text.startsWith("[") && text.endsWith("]"))
        ) {
          try {
            out[key] = JSON.parse(text);
            continue;
          } catch {
            /* biarkan sebagai teks biasa */
          }
        }
        if (text === "true" || text === "false") {
          out[key] = text === "true";
          continue;
        }
      }
      out[key] = value;
    }
    return out as T;
  });
}

function downloadBackup(cards: PlayingCard[], entries: CardEntry[], stamp: number) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(cards.length ? toRows(cards) : [{}]),
    CARD_SHEET,
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(entries.length ? toRows(entries) : [{}]),
    ENTRY_SHEET,
  );
  const date = new Date(stamp);
  const name = `backup-playing-card-${date.toISOString().slice(0, 10)}-${String(
    date.getHours(),
  ).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}.xlsx`;
  XLSX.writeFile(wb, name);
}

export function CardBackupPanel() {
  const {
    playingCards,
    cardEntries,
    cardBackups,
    createCardBackup,
    restoreCardBackup,
    restoreCardBackupData,
    removeCardBackup,
  } = useBilling();
  const allow = useCan();
  const { confirm, dialog } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<RestoreMode>("merge");

  const canCreate = allow("kartu.backup");
  const canRestore = allow("kartu.restore");
  const canDelete = allow("kartu.hapusbackup");
  const list = cardBackups ?? [];
  const totalBalance = playingCards.reduce((sum, c) => sum + (c.balance ?? 0), 0);

  const handleCreate = () => {
    const backup = createCardBackup("manual");
    if (!backup) {
      toast.error("Backup gagal dibuat");
      return;
    }
    downloadBackup(backup.cards, backup.entries, backup.createdAt);
    toast.success(
      `Backup dibuat: ${backup.cardCount} kartu · ${formatRupiah(backup.totalBalance)}`,
    );
  };

  const handleRestore = (backup: CardBackup) =>
    confirm({
      title: "Pulihkan data kartu dari backup ini?",
      description:
        mode === "replace"
          ? `Seluruh data kartu saat ini (${playingCards.length} kartu) diganti dengan isi backup ${new Date(backup.createdAt).toLocaleString("id-ID")}.`
          : `Hanya kartu yang hilang yang ditambahkan dari backup ${new Date(backup.createdAt).toLocaleString("id-ID")}. Kartu yang ada sekarang tidak diubah.`,
      actionLabel: "Restore",
      ...(mode === "replace" ? { requireTypedWord: "RESTORE" } : {}),
      onConfirm: () => {
        if (restoreCardBackup(backup.id, mode)) toast.success("Data kartu dipulihkan");
        else toast.error("Backup tidak ditemukan");
      },
    });

  const handleFile = async (file: File) => {
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const cardWs = wb.Sheets[CARD_SHEET];
      if (!cardWs) {
        toast.error(`Berkas tidak berisi lembar "${CARD_SHEET}"`);
        return;
      }
      const cards = fromRows<PlayingCard>(
        XLSX.utils.sheet_to_json<Row>(cardWs, { defval: "" }),
      ).filter((c) => c && c.id && c.cardNumber);
      const entryWs = wb.Sheets[ENTRY_SHEET];
      const entries = entryWs
        ? fromRows<CardEntry>(XLSX.utils.sheet_to_json<Row>(entryWs, { defval: "" })).filter(
            (e) => e && e.id && e.cardId,
          )
        : [];
      if (!cards.length) {
        toast.error("Tidak ada data kartu yang bisa dibaca dari berkas");
        return;
      }
      confirm({
        title: `Pulihkan ${cards.length} kartu dari berkas?`,
        description:
          mode === "replace"
            ? "Seluruh data kartu saat ini diganti dengan isi berkas."
            : "Hanya kartu yang hilang yang ditambahkan dari berkas.",
        actionLabel: "Pulihkan",
        ...(mode === "replace" ? { requireTypedWord: "RESTORE" } : {}),
        onConfirm: () => {
          if (restoreCardBackupData({ cards, entries }, mode, file.name))
            toast.success("Data kartu dipulihkan dari berkas");
          else toast.error("Berkas tidak berisi data kartu");
        },
      });
    } catch {
      toast.error("Berkas tidak bisa dibaca");
    }
  };

  const handleDelete = (backup: CardBackup) =>
    confirm({
      title: "Hapus backup ini?",
      description: `Backup ${new Date(backup.createdAt).toLocaleString("id-ID")} akan dihapus dan tidak bisa dipulihkan lagi.`,
      onConfirm: () => {
        removeCardBackup(backup.id);
        toast.success("Backup dihapus");
      },
    });

  return (
    <section className="surface-panel space-y-4 p-4 sm:p-6">
      <SetupHeading
        title="Backup & Restore Saldo Kartu"
        description={`Data sekarang: ${playingCards.length} kartu · total saldo ${formatRupiah(totalBalance)} · ${cardEntries.length} transaksi kartu. Backup otomatis dibuat setiap close out shift, maksimal 10 backup terbaru disimpan.`}
      />

      <div className="flex flex-wrap items-end gap-2">
        <Button onClick={handleCreate} disabled={!canCreate}>
          <DatabaseBackup className="size-4" /> Buat Backup Sekarang
        </Button>
        <div className="space-y-1.5">
          <Label htmlFor="card-restore-mode">Cara restore</Label>
          <Select value={mode} onValueChange={(value) => setMode(value as RestoreMode)}>
            <SelectTrigger id="card-restore-mode" className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="merge">Hanya tambah kartu yang hilang</SelectItem>
              <SelectItem value="replace">Ganti semua data kartu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          disabled={!canRestore}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="size-4" /> Pulihkan dari file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </div>

      {!canCreate && (
        <p className="text-sm text-muted-foreground">
          Level Anda tidak diizinkan membuat backup saldo kartu.
        </p>
      )}

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada backup. Tekan &quot;Buat Backup Sekarang&quot; setelah closing.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((backup) => (
            <li
              key={backup.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {new Date(backup.createdAt).toLocaleString("id-ID")}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {backup.source === "closing" ? "otomatis (closing)" : "manual"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {backup.cardCount} kartu · total saldo {formatRupiah(backup.totalBalance)} ·
                  oleh {backup.actorName || "-"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canCreate}
                  onClick={() => downloadBackup(backup.cards, backup.entries, backup.createdAt)}
                >
                  <Download className="size-4" /> Unduh
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canRestore}
                  onClick={() => handleRestore(backup)}
                >
                  <RotateCcw className="size-4" /> Restore
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={!canDelete}
                  onClick={() => handleDelete(backup)}
                >
                  <Trash2 className="size-4" /> Hapus
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialog}
    </section>
  );
}
