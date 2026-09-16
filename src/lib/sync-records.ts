import type { BillingSnapshot } from "./billing-store";

export type SyncRecord = {
  kind: string;
  entity_id: string;
  payload: Record<string, unknown>;
  deleted: boolean;
};

/** Kind -> nama koleksi di dalam state billing. */
export const LIST_KINDS = {
  station: "stations",
  menu: "menu",
  payment: "paymentMethods",
  package: "packages",
  customer: "customers",
  booking: "bookings",
  promotion: "promotions",
  point: "pointEntries",
  history: "history",
  cafe_table: "cafeTables",
  playing_card: "playingCards",
  card_entry: "cardEntries",
  cash_category: "cashCategories",
  cash_entry: "cashEntries",
  shift: "shifts",
  business_day: "businessDays",
  log_entry: "logEntries",
  addon_rental: "addonRentals",
} as const;

type ListKind = keyof typeof LIST_KINDS;

export const SETTINGS_KIND = "settings";
export const SETTINGS_ID = "app";

const SETTINGS_KEYS = [
  "consoleTypes",
  "rates",
  "roundingRule",
  "defaultBonusMin",
  "pointsPerRupiah",
  "menuCategories",
  "cardPrice",
  "cardDiscountPercent",
  "cardMemberDiscountPercent",
  "consoleDiscounts",
  "tvNotice",
  "printers",
  "receiptLayout",
  "invoiceLayout",
  "rolePermissions",
] as const;


export const recordKey = (kind: string, entityId: string) => `${kind}:${entityId}`;

/**
 * Hanya jenis data yang dikenal versi aplikasi ini boleh dihapus dari pusat.
 * Tanpa ini, aplikasi versi lama akan menghapus data jenis baru
 * (misal item kas) hanya karena ia belum mengenalnya.
 */
export const isKnownKind = (kind: string) =>
  kind === SETTINGS_KIND || kind in LIST_KINDS;

type AnyRow = { id: string } & Record<string, unknown>;

/** Pecah state menjadi baris-baris kecil agar bisa disinkronkan per entitas. */
export function flattenSnapshot(state: BillingSnapshot) {
  const out = new Map<string, SyncRecord>();
  for (const kind of Object.keys(LIST_KINDS) as ListKind[]) {
    const rows = (state[LIST_KINDS[kind]] ?? []) as unknown as AnyRow[];
    for (const row of rows) {
      if (!row?.id) continue;
      out.set(recordKey(kind, row.id), {
        kind,
        entity_id: row.id,
        payload: row as Record<string, unknown>,
        deleted: false,
      });
    }
  }
  // Setiap pengaturan disimpan sebagai baris sendiri. Kalau satu blok besar,
  // perangkat lain yang pengaturannya masih lama bisa menimpa pengaturan baru
  // (misal hak akses per level) hanya karena ikut mengirim blok itu.
  for (const key of SETTINGS_KEYS) {
    const value = state[key];
    // Pengaturan hak akses yang masih kosong berarti "belum diatur": jangan
    // dikirim, supaya perangkat lain tidak menghapus pengaturan yang sudah ada.
    if (key === "rolePermissions" && Object.keys((value ?? {}) as object).length === 0) {
      continue;
    }
    out.set(recordKey(SETTINGS_KIND, key), {
      kind: SETTINGS_KIND,
      entity_id: key,
      payload: { [key]: value },
      deleted: false,
    });
  }

  return out;
}


/** Gabungkan baris dari pusat ke state lokal. */
export function applyRecords(
  state: BillingSnapshot,
  records: SyncRecord[],
): BillingSnapshot {
  const next: BillingSnapshot = {
    ...state,
    stations: [...state.stations],
    menu: [...state.menu],
    paymentMethods: [...state.paymentMethods],
    packages: [...state.packages],
    customers: [...state.customers],
    bookings: [...state.bookings],
    promotions: [...state.promotions],
    pointEntries: [...state.pointEntries],
    history: [...state.history],
    cafeTables: [...state.cafeTables],
    playingCards: [...state.playingCards],
    cardEntries: [...state.cardEntries],
    cashCategories: [...state.cashCategories],
    cashEntries: [...state.cashEntries],
    shifts: [...(state.shifts ?? [])],
    logEntries: [...(state.logEntries ?? [])],
    addonRentals: [...(state.addonRentals ?? [])],
  };


  for (const record of records) {
    if (record.kind === SETTINGS_KIND) {
      if (record.deleted) continue;
      const payload = record.payload as Partial<BillingSnapshot>;
      for (const key of SETTINGS_KEYS) {
        if (payload[key] !== undefined) {
          (next as Record<string, unknown>)[key] = payload[key];
        }
      }
      continue;
    }
    const listName = LIST_KINDS[record.kind as ListKind];
    if (!listName) continue;
    const list = next[listName] as unknown as AnyRow[];
    const index = list.findIndex((row) => row.id === record.entity_id);
    if (record.deleted) {
      if (index >= 0) list.splice(index, 1);
      continue;
    }
    const row = { ...(record.payload as AnyRow), id: record.entity_id };
    if (index >= 0) list[index] = row;
    else list.push(row);
  }

  const SORTED = ["stations", "menu", "packages", "paymentMethods", "cafeTables", "cashCategories", "addonRentals"] as const;
  for (const listName of SORTED) {
    const list = next[listName] as unknown as ({ sort?: number } & AnyRow)[];
    list.sort((a, b) => (a.sort ?? Number.MAX_SAFE_INTEGER) - (b.sort ?? Number.MAX_SAFE_INTEGER));
  }

  return next;
}

/**
 * Kosongkan seluruh koleksi yang disinkronkan. Dipakai saat perangkat pertama
 * kali mengambil data satu store: isi pusat menjadi satu-satunya sumber, agar
 * sisa data bawaan atau data store sebelumnya tidak ikut terkirim.
 */
export function clearSyncedLists(state: BillingSnapshot): BillingSnapshot {
  const next = { ...state } as Record<string, unknown>;
  for (const kind of Object.keys(LIST_KINDS) as ListKind[]) {
    next[LIST_KINDS[kind]] = [];
  }
  return next as BillingSnapshot;
}
