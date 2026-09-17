import { useState, type ReactNode } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ConfirmOptions = {
  title: string;
  description?: string;
  actionLabel?: string;
  destructive?: boolean;
  /** Kalau diisi, pengguna harus mengetik kata ini dulu (mis. "HAPUS"). */
  requireTypedWord?: string;
  onConfirm: () => void;
};

/**
 * Konfirmasi sekali pakai untuk aksi hapus / simpan.
 * Pakai: const { confirm, dialog } = useConfirm(); lalu render {dialog}.
 */
export function useConfirm() {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState("");

  const close = () => {
    setPending(null);
    setTyped("");
  };

  const confirm = (options: ConfirmOptions) => {
    setTyped("");
    setPending(options);
  };

  const word = pending?.requireTypedWord;
  const ready = !word || typed.trim().toUpperCase() === word.toUpperCase();

  const dialog: ReactNode = (
    <AlertDialog open={Boolean(pending)} onOpenChange={(open) => !open && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
          {pending?.description && (
            <AlertDialogDescription>{pending.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {word && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-word">
              Ketik {word} untuk melanjutkan
            </Label>
            <Input
              id="confirm-word"
              value={typed}
              autoComplete="off"
              placeholder={word}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={!ready}
            className={
              pending?.destructive === false
                ? undefined
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }
            onClick={(e) => {
              if (!ready) {
                e.preventDefault();
                return;
              }
              pending?.onConfirm();
              close();
            }}
          >
            {pending?.actionLabel ?? "Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
