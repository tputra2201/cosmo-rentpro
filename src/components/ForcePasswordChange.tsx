import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, ShieldAlert } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { markPasswordChanged as markPasswordChangedFn } from "@/lib/users.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForcePasswordChange() {
  const { markPasswordChanged, signOut } = useAuth();
  const markDone = useServerFn(markPasswordChangedFn);
  const navigate = useNavigate();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 6) {
      toast.error("Kata sandi minimal 6 karakter");
      return;
    }
    if (next !== confirm) {
      toast.error("Konfirmasi kata sandi tidak sama");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      await markDone({});
      markPasswordChanged();
      toast.success("Kata sandi baru tersimpan. Silakan masuk kembali.");
      await signOut();
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah kata sandi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm">
      <form className="surface-panel w-full max-w-md p-6" onSubmit={submit}>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary glow-primary">
            <ShieldAlert className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-neon">
              Ganti Kata Sandi
            </h2>
            <p className="text-xs text-muted-foreground">
              Demi keamanan, ganti kata sandi awal dari Admin sebelum memakai
              aplikasi.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="force-new">Kata sandi baru</Label>
            <div className="relative">
              <Input
                id="force-new"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                minLength={6}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="force-confirm">Ulangi kata sandi baru</Label>
            <Input
              id="force-confirm"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Ketik ulang kata sandi"
              required
            />
            {mismatch && (
              <p className="text-xs text-destructive">
                Kata sandi belum sama persis.
              </p>
            )}
          </div>

          <Button type="submit" disabled={busy || mismatch}>
            <KeyRound className="size-4" /> Simpan kata sandi baru
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => void signOut().then(() => navigate({ to: "/auth", replace: true }))}
          >
            Keluar dulu
          </button>
        </div>
      </form>
    </div>
  );
}
