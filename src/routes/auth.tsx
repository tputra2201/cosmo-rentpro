import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Joystick, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk Akun — Billing Rental PS" },
      {
        name: "description",
        content:
          "Masuk dengan akun staf yang sudah didaftarkan Admin untuk mengelola billing rental PlayStation.",
      },
      { property: "og:title", content: "Masuk Akun — Billing Rental PS" },
      {
        property: "og:description",
        content: "Halaman login staf untuk aplikasi billing rental PlayStation.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const branding = useBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [devSecret, setDevSecret] = useState("");
  const [devBusy, setDevBusy] = useState(false);

  const openControlCenter = async () => {
    if (!devSecret) return;
    setDevBusy(true);
    try {
      const res = await fetch("/api/public/store-registry", {
        headers: { "x-control-secret": devSecret },
      });
      if (res.status === 401) {
        toast.error("Kunci Developer salah.");
        return;
      }
      if (!res.ok) {
        toast.error("Gagal membuka pusat kontrol.");
        return;
      }
      sessionStorage.setItem("rentalpro-control-secret", devSecret);
      setDevOpen(false);
      setDevSecret("");
      navigate({ to: "/kontrol" });
    } catch {
      toast.error("Tidak bisa terhubung ke pusat kontrol.");
    } finally {
      setDevBusy(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Berhasil masuk");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(
        message.includes("Invalid login credentials")
          ? "Email atau kata sandi salah"
          : message,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center">
      <div className="surface-panel p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <button
            type="button"
            onClick={() => setDevOpen(true)}
            title="Akses Developer"
            aria-label="Akses Developer"
            className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {branding.logo_url ? (
              <img
                src={branding.logo_url}
                alt={branding.login_title || "Logo aplikasi"}
                className="size-20 rounded-xl object-contain"
              />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary glow-primary">
                <Joystick className="size-6" />
              </span>
            )}
          </button>
          {branding.login_title.trim() && (
            <h1 className="mt-4 font-display text-2xl font-bold text-neon">
              {branding.login_title}
            </h1>
          )}
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Kata sandi</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kata sandi dari Admin"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            <LogIn className="size-4" /> Masuk
          </Button>
        </form>

        {branding.login_note.trim() && (
          <p className="mt-6 whitespace-pre-line text-center text-xs text-muted-foreground">
            {branding.login_note}
          </p>
        )}

      </div>

      <Dialog open={devOpen} onOpenChange={setDevOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockKeyhole className="size-4" /> Akses Developer
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="dev-secret">Kunci Developer</Label>
            <Input
              id="dev-secret"
              type="password"
              value={devSecret}
              onChange={(e) => setDevSecret(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void openControlCenter();
              }}
              placeholder="••••••••"
            />
          </div>
          <Button disabled={!devSecret || devBusy} onClick={() => void openControlCenter()}>
            <LockKeyhole className="size-4" /> Buka pusat kontrol
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
