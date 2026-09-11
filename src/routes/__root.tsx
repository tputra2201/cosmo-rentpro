import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import {
  LayoutGrid,
  Settings2,
  Tv,
  BarChart3,
  Joystick,
  Receipt,
  Wallet,
  DatabaseBackup,
  Menu,
  CalendarDays,
  Users,
  Percent,
  LogOut,
  UserCog,
  KeyRound,
  Store,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BillingProvider, useBilling } from "@/lib/billing-store";
import {
  AuthProvider,
  useAuth,
  roleLabel,
  adminOnlyPaths,
  installerOnlyPaths,
  isAdminLevel,
} from "@/lib/auth";
import { Toaster } from "../components/ui/sonner";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "../components/ui/sheet";
import { ForcePasswordChange } from "@/components/ForcePasswordChange";
import { appSignature } from "@/lib/app-info";
import { useStoreInfo } from "@/lib/store-info";
import { ThemeProvider } from "@/lib/theme";



function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Halaman tidak ditemukan
        </h2>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Halaman gagal dimuat
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Terjadi kesalahan. Coba muat ulang halaman.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Coba lagi
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Billing Rental PS" },
      {
        name: "description",
        content:
          "Aplikasi kasir dan timer rental PlayStation: monitor TV, tarif, dan laporan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },

      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className="dark theme-gelap">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/kasir", label: "Kasir", icon: Receipt },
  { to: "/booking", label: "Booking", icon: CalendarDays },
  { to: "/pelanggan", label: "Pelanggan", icon: Users },
  { to: "/promo", label: "Promo", icon: Percent },
  { to: "/pembayaran", label: "Pembayaran", icon: Wallet },
  { to: "/tarif", label: "Tarif", icon: Settings2 },
  { to: "/unit", label: "Unit TV", icon: Tv },
  { to: "/laporan", label: "Laporan", icon: BarChart3 },
  { to: "/pengguna", label: "Pengguna", icon: UserCog },
  { to: "/backup", label: "Backup", icon: DatabaseBackup },
  { to: "/store", label: "Store", icon: Store },
  { to: "/akun", label: "Akun", icon: KeyRound },
] as const;

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BillingProvider>
            <AppShell />
            <Toaster position="top-right" richColors />
          </BillingProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>

  );
}

function AppShell() {
  const { session, role, fullName, user, signOut, mustChangePassword } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isAuthPage = pathname === "/auth";
  const [menuOpen, setMenuOpen] = useState(false);
  const { store } = useStoreInfo(Boolean(session));
  const { sync } = useBilling();
  const storeName = store?.store_name?.trim() ?? "";
  const signature = appSignature(store?.app_version, store?.dev_contact);
  const expiresAt = store?.expires_at ?? null;

  const expiryDate = expiresAt ? new Date(expiresAt) : null;
  const msLeft = expiryDate ? expiryDate.getTime() - Date.now() : null;
  const daysLeft =
    msLeft === null ? null : Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const expired = msLeft !== null && msLeft <= 0;
  const expiryLabel = expiryDate
    ? expiryDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";



  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Tautan undangan / pemulihan sandi kadang mendarat di halaman lain.
  // Arahkan ke halaman buat kata sandi agar tidak langsung masuk Dashboard.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname === "/atur-sandi") return;
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const type = search.get("type") ?? hash.get("type");
    const hasCode = Boolean(search.get("code") ?? hash.get("access_token"));
    if (hasCode || type === "invite" || type === "recovery" || type === "signup") {
      navigate({
        to: "/atur-sandi",
        search: Object.fromEntries(search.entries()),
        replace: true,
      });
    }
  }, [pathname, navigate]);

  const items = navItems.filter(({ to }) => {
    if (installerOnlyPaths.includes(to)) return role === "installer";
    return isAdminLevel(role) || !adminOnlyPaths.includes(to);
  });
  const blocked =
    session !== null &&
    ((installerOnlyPaths.includes(pathname) && role !== "installer") ||
      (!isAdminLevel(role) && adminOnlyPaths.includes(pathname)));

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link to={session ? "/" : "/auth"} className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary glow-primary">
              <Joystick className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-display text-lg font-bold tracking-wide text-neon">
                {storeName || "BILLING RENTAL PS"}
              </span>
              <span className="truncate font-mono text-[11px] tracking-wide text-muted-foreground">
                {signature}
              </span>
            </span>
          </Link>
          {session && !isAuthPage && (
            <>
              <nav className="hidden items-center gap-1 xl:flex">
                {items.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    activeOptions={{ exact: to === "/" }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    activeProps={{ className: "bg-secondary text-primary" }}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-2">
                <span
                  title={
                    sync.online
                      ? sync.pending > 0
                        ? `${sync.pending} perubahan menunggu terkirim`
                        : "Data tersimpan di pusat"
                      : "Mode luring — data disimpan di perangkat dan dikirim otomatis saat internet kembali"
                  }
                  className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${
                    sync.online
                      ? sync.pending > 0
                        ? "border-warning/50 bg-warning/10 text-warning"
                        : "border-success/50 bg-success/10 text-success"
                      : "border-destructive/50 bg-destructive/10 text-destructive"
                  }`}
                >
                  {sync.online ? (sync.pending > 0 ? <RefreshCw className="size-3 animate-spin" /> : <Wifi className="size-3" />) : <WifiOff className="size-3" />}
                  {sync.online
                    ? sync.pending > 0
                      ? `Mengirim ${sync.pending}`
                      : "Tersinkron"
                    : "Mode luring"}
                </span>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium leading-tight">
                    {fullName || user?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {role ? roleLabel[role] : "Memuat…"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Keluar"
                  onClick={handleSignOut}
                >
                  <LogOut className="size-4" />
                </Button>
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="xl:hidden"
                      aria-label="Buka menu"
                    >
                      <Menu className="size-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="flex w-[min(20rem,88vw)] flex-col gap-0 p-4"
                  >
                    <SheetTitle className="text-base">Menu Operasional</SheetTitle>
                    <nav className="mt-3 grid grid-cols-2 gap-1.5">
                      {items.map(({ to, label, icon: Icon }) => (
                        <Link
                          key={to}
                          to={to}
                          activeOptions={{ exact: to === "/" }}
                          onClick={() => setMenuOpen(false)}
                          className="flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-secondary/25 px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          activeProps={{
                            className:
                              "bg-secondary text-primary border-primary/50 glow-primary",
                          }}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{label}</span>
                        </Link>
                      ))}
                    </nav>
                  </SheetContent>
                </Sheet>
              </div>
            </>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {session && !isAuthPage && expired ? (
          <div className="surface-panel mx-auto max-w-lg border-destructive/60 p-8 text-center">
            <h1 className="blink-warning font-display text-2xl font-bold text-destructive">
              Masa aktif aplikasi telah berakhir
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Aplikasi berakhir pada {expiryLabel} dan tidak dapat digunakan
              untuk sementara. Silakan hubungi Developer untuk memperpanjang
              masa aktif.
            </p>
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              {signature}
            </p>
            <Button variant="outline" className="mt-6" onClick={handleSignOut}>
              Keluar
            </Button>
          </div>
        ) : (
          <>
            {session && !isAuthPage && daysLeft !== null && daysLeft <= 10 && (
              <div className="blink-warning mb-6 rounded-lg border border-warning/60 bg-warning/10 px-4 py-3 text-center text-sm font-semibold text-warning">
                Masa aktif aplikasi berakhir dalam {daysLeft} hari ({expiryLabel}
                ). Segera hubungi Developer untuk perpanjangan.
              </div>
            )}
            {blocked ? (
              <div className="surface-panel mx-auto max-w-md p-8 text-center">
                <h1 className="text-xl font-semibold">Akses terbatas</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {installerOnlyPaths.includes(pathname)
                    ? "Halaman ini hanya untuk Installer."
                    : "Halaman ini hanya untuk Admin. Silakan hubungi Admin bila kamu membutuhkan aksesnya."}
                </p>
                <Button className="mt-6" onClick={() => navigate({ to: "/" })}>
                  Kembali ke Dashboard
                </Button>
              </div>
            ) : (
              <Outlet />
            )}
          </>
        )}
      </main>

      {session && !isAuthPage && mustChangePassword && <ForcePasswordChange />}
    </div>
  );
}

