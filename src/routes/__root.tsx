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
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BillingProvider } from "@/lib/billing-store";
import { AuthProvider, useAuth, roleLabel, adminOnlyPaths } from "@/lib/auth";
import { Toaster } from "../components/ui/sonner";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "../components/ui/sheet";

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
        href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap",
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
    <html lang="id" className="dark">
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
  { to: "/backup", label: "Backup", icon: DatabaseBackup },
] as const;

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BillingProvider>
          <AppShell />
          <Toaster position="top-right" richColors />
        </BillingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const { session, role, fullName, user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isAuthPage = pathname === "/auth";

  const items = navItems.filter(
    ({ to }) => role === "admin" || !adminOnlyPaths.includes(to),
  );
  const blocked =
    session !== null && role === "kasir" && adminOnlyPaths.includes(pathname);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link to={session ? "/" : "/auth"} className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary glow-primary">
              <Joystick className="size-5" />
            </span>
            <span className="font-display text-lg font-bold tracking-wide text-neon">
              BILLING RENTAL PS
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
                <Sheet>
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
                  <SheetContent side="right" className="w-72">
                    <SheetTitle>Menu Operasional</SheetTitle>
                    <nav className="mt-6 grid gap-2">
                      {items.map(({ to, label, icon: Icon }) => (
                        <Link
                          key={to}
                          to={to}
                          activeOptions={{ exact: to === "/" }}
                          className="flex items-center gap-3 rounded-md px-3 py-3 text-muted-foreground"
                          activeProps={{ className: "bg-secondary text-primary" }}
                        >
                          <Icon className="size-4" />
                          {label}
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
        {blocked ? (
          <div className="surface-panel mx-auto max-w-md p-8 text-center">
            <h1 className="text-xl font-semibold">Akses terbatas</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Halaman ini hanya untuk Admin. Silakan hubungi Admin bila kamu
              membutuhkan aksesnya.
            </p>
            <Button className="mt-6" onClick={() => navigate({ to: "/" })}>
              Kembali ke Dashboard
            </Button>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
