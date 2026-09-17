/**
 * Daftar level pengguna dan hak akses per menu/fitur.
 * Installer selalu punya akses penuh dan tidak bisa dibatasi.
 */

export type AppRole =
  | "installer"
  | "manager"
  | "admin"
  | "finance"
  | "kasir"
  | "operator";

export const ALL_ROLES: AppRole[] = [
  "installer",
  "manager",
  "finance",
  "kasir",
  "operator",
];

export const roleLabel: Record<AppRole, string> = {
  installer: "Installer",
  manager: "Manager",
  admin: "Admin (lama)",
  finance: "Finance",
  kasir: "Kasir",
  operator: "Operator",
};

export type PermissionItem = { key: string; label: string };
export type PermissionGroup = { label: string; items: PermissionItem[] };

/** Menu utama: path -> kunci hak akses. */
export const MENU_PERMISSION: Record<string, string> = {
  "/": "menu.dashboard",
  "/kasir": "menu.kasir",
  "/shift": "menu.shift",
  "/tv": "menu.tv",
  "/kafe": "menu.kafe",
  "/booking": "menu.booking",
  "/pelanggan": "menu.pelanggan",
  "/promo": "menu.promo",
  "/kartu": "menu.kartu",
  "/kas": "menu.kas",
  "/pembayaran": "menu.pembayaran",
  "/tarif": "menu.tarif",
  "/laporan": "menu.laporan",
  "/pengguna": "menu.pengguna",
  "/backup": "menu.backup",
  "/printer": "menu.printer",
  "/store": "menu.store",
  "/akun": "menu.akun",
  "/tema": "menu.tema",
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "Menu utama",
    items: [
      { key: "menu.dashboard", label: "Dashboard" },
      { key: "menu.kasir", label: "Kasir (lama)" },
      { key: "menu.shift", label: "Kasir" },
      { key: "menu.tv", label: "TV Connect" },
      { key: "menu.kafe", label: "Kafe" },
      { key: "menu.booking", label: "Reservasi" },
      { key: "menu.pelanggan", label: "Membership" },
      { key: "menu.promo", label: "Promo" },
      { key: "menu.kartu", label: "Playing Card" },
      { key: "menu.kas", label: "Finance" },
      { key: "menu.pembayaran", label: "Payment" },
      { key: "menu.tarif", label: "Pricing" },
      { key: "menu.laporan", label: "Reports" },
      { key: "menu.pengguna", label: "User" },
      { key: "menu.printer", label: "Printer & Cetak" },
      { key: "menu.backup", label: "Backup" },
      { key: "menu.store", label: "Store" },
      { key: "menu.akun", label: "Password" },
      { key: "menu.tema", label: "Tema Tampilan" },
    ],
  },
  {
    label: "Sub menu Laporan",
    items: [
      { key: "laporan.receipt", label: "Laporan Receipt" },
      { key: "laporan.company", label: "Company Report" },
      { key: "laporan.card", label: "Laporan Playing Card" },
      { key: "laporan.shift", label: "Cash Close Out" },
      { key: "laporan.membership", label: "Laporan Membership" },
      { key: "laporan.qris", label: "Pembayaran QRIS" },
      { key: "laporan.transfer", label: "Transfer Bank" },
      { key: "laporan.kasir", label: "Laporan Transaksi per Kasir" },
      { key: "laporan.logbook", label: "Log Book Aktivitas" },
      { key: "laporan.statistik", label: "Statistik Terlaris" },
      { key: "laporan.void", label: "Laporan VOID" },
      { key: "laporan.perangkat", label: "Laporan Transaksi per Perangkat" },
      { key: "laporan.hapus", label: "Hapus data laporan" },
      { key: "laporan.cetak", label: "Cetak laporan" },
    ],
  },
  {
    label: "Sesi rental",
    items: [
      { key: "sesi.mulai", label: "Mulai sesi rental" },
      { key: "sesi.tambahwaktu", label: "Tambah / kurangi waktu" },
      { key: "sesi.diskon", label: "Beri diskon" },
      { key: "sesi.bayar", label: "Terima pembayaran" },
      { key: "sesi.akhiri", label: "Akhiri sesi" },
      { key: "cetak.struk", label: "Cetak struk / invoice" },
      { key: "cetak.label", label: "Cetak label dapur / bar" },
    ],
  },
  {
    label: "Kasir & kas",
    items: [
      { key: "shift.checkin", label: "Check-in shift" },
      { key: "shift.closeout", label: "Cash close out" },
      { key: "kas.tambah", label: "Catat kas masuk / keluar" },
      { key: "kartu.jual", label: "Jual Playing Card" },
      { key: "kartu.topup", label: "Top up saldo kartu" },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { key: "tarif.ubah", label: "Ubah tarif & pengaturan unit" },
      { key: "promo.kelola", label: "Kelola promo" },
      { key: "pelanggan.kelola", label: "Kelola data pelanggan" },
      { key: "pembayaran.kelola", label: "Kelola metode pembayaran" },
      { key: "pengguna.kelola", label: "Tambah / ubah pengguna" },
      { key: "pengguna.hakakses", label: "Atur hak akses per level" },
      { key: "backup.export", label: "Backup data (unduh)" },
      { key: "backup.import", label: "Pulihkan data" },
      { key: "backup.reset", label: "Reset ke pengaturan awal" },
      { key: "store.ubah", label: "Ubah data store" },
      { key: "printer.kelola", label: "Atur printer & layout cetak" },
    ],
  },
];

export const ALL_PERMISSIONS: string[] = PERMISSION_GROUPS.flatMap((g) =>
  g.items.map((i) => i.key),
);

const managerDefaults = ALL_PERMISSIONS.filter(
  (key) => key !== "menu.store" && key !== "store.ubah" && key !== "pengguna.hakakses",
);

/** Hak akses awal untuk setiap level (Installer selalu penuh). */
export const defaultRolePermissions: Record<AppRole, string[]> = {
  installer: ALL_PERMISSIONS,
  manager: managerDefaults,
  admin: managerDefaults,
  finance: [
    "menu.dashboard",
    "menu.laporan",
    "menu.kas",
    "menu.pembayaran",
    "menu.kartu",
    "menu.akun",
    "menu.tema",
    "laporan.receipt",
    "laporan.company",
    "laporan.card",
    "laporan.shift",
    "laporan.membership",
    "laporan.qris",
    "laporan.transfer",
    "laporan.logbook",
    "laporan.statistik",
    "laporan.void",
    "laporan.perangkat",
    "kas.tambah",
    "kartu.topup",
    "pembayaran.kelola",
    "backup.export",
    "laporan.cetak",
  ],
  kasir: [
    "menu.dashboard",
    "menu.kasir",
    "menu.shift",
    "menu.tv",
    "menu.kafe",
    "menu.booking",
    "menu.pelanggan",
    "menu.kartu",
    "menu.kas",
    "menu.akun",
    "menu.tema",
    "sesi.mulai",
    "sesi.tambahwaktu",
    "sesi.bayar",
    "sesi.akhiri",
    "shift.checkin",
    "shift.closeout",
    "kas.tambah",
    "kartu.jual",
    "kartu.topup",
    "pelanggan.kelola",
    "cetak.struk",
    "cetak.label",
  ],
  operator: [
    "menu.dashboard",
    "menu.kasir",
    "menu.tv",
    "menu.kafe",
    "menu.akun",
    "menu.tema",
    "sesi.mulai",
    "sesi.tambahwaktu",
    "cetak.label",
  ],
};

export type RolePermissions = Partial<Record<string, string[]>>;

/** Hak akses yang berlaku untuk sebuah level (pengaturan Installer menimpa default). */
export function permissionsOf(
  role: AppRole | null,
  overrides: RolePermissions | undefined,
): string[] {
  if (!role) return [];
  if (role === "installer") return ALL_PERMISSIONS;
  return overrides?.[role] ?? defaultRolePermissions[role] ?? [];
}

export function can(
  role: AppRole | null,
  key: string,
  overrides?: RolePermissions,
): boolean {
  if (role === "installer") return true;
  return permissionsOf(role, overrides).includes(key);
}
