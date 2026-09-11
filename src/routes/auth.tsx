import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Joystick, LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
          "Masuk atau daftar akun Admin dan Kasir untuk mengelola billing rental PlayStation.",
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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

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
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Berhasil masuk");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          toast.success("Cek email untuk konfirmasi akun");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(
        message.includes("Invalid login credentials")
          ? "Email atau kata sandi salah"
          : message.includes("already registered")
            ? "Email sudah terdaftar, silakan masuk"
            : message,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Gagal masuk dengan Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center">
      <div className="surface-panel p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary glow-primary">
            <Joystick className="size-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-neon">
            BILLING RENTAL PS
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Masuk untuk mulai mengelola operasional."
              : "Buat akun staf baru."}
          </p>
        </div>

        {checkEmail ? (
          <div className="mt-6 rounded-lg border border-border bg-secondary/40 p-4 text-center text-sm">
            <p>
              Kami mengirim tautan konfirmasi ke <b>{email}</b>. Buka email lalu
              klik tautannya untuk mengaktifkan akun.
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => {
                setCheckEmail(false);
                setMode("login");
              }}
            >
              Kembali ke halaman masuk
            </Button>
          </div>
        ) : (
          <>
            <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
              {mode === "signup" && (
                <div className="grid gap-2">
                  <Label htmlFor="nama">Nama lengkap</Label>
                  <Input
                    id="nama"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama staf"
                    required
                  />
                </div>
              )}
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
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {mode === "login" ? (
                  <>
                    <LogIn className="size-4" /> Masuk
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" /> Daftar
                  </>
                )}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> atau
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={handleGoogle}
            >
              Lanjutkan dengan Google
            </Button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
              >
                {mode === "login" ? "Daftar di sini" : "Masuk di sini"}
              </button>
            </p>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Akun pertama yang mendaftar otomatis menjadi Admin, akun berikutnya
              menjadi Kasir.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
