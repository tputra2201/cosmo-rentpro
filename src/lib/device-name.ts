/**
 * Nama perangkat yang mudah dibaca orang awam.
 *
 * Peramban hanya memberi kode pabrik (contoh "25040RP0AG") dan sistem operasi.
 * Kamus di bawah menerjemahkan kode itu menjadi merk/tipe yang dikenal pemakai,
 * misalnya "Xiaomi Redmi Pad" atau "Samsung Galaxy Tab".
 */

type Rule = { test: RegExp; name: string };

/** Kode model diawali huruf khas tiap merk. */
const MODEL_RULES: Rule[] = [
  { test: /^SM-T|^SM-X|^SM-P/i, name: "Samsung Galaxy Tab" },
  { test: /^SM-/i, name: "Samsung Galaxy" },
  { test: /^GT-/i, name: "Samsung Galaxy" },
  { test: /redmi ?pad/i, name: "Xiaomi Redmi Pad" },
  { test: /redmi/i, name: "Xiaomi Redmi" },
  { test: /poco/i, name: "Xiaomi POCO" },
  { test: /^(mi|xiaomi|pad)/i, name: "Xiaomi" },
  { test: /^CPH|^PH[A-Z]|oppo/i, name: "OPPO" },
  { test: /^RMX|realme/i, name: "Realme" },
  { test: /^V\d{4}|vivo/i, name: "vivo" },
  { test: /^INFINIX|^X6|^X7/i, name: "Infinix" },
  { test: /^TECNO/i, name: "TECNO" },
  { test: /^ITEL/i, name: "itel" },
  { test: /^LM-|^LG/i, name: "LG" },
  { test: /^HUAWEI|^MED-|^AGS/i, name: "Huawei" },
  { test: /^NOKIA|^TA-\d/i, name: "Nokia" },
  { test: /^ASUS|^ZS|^ZE/i, name: "ASUS" },
  { test: /^Lenovo|^TB-/i, name: "Lenovo Tab" },
  { test: /^ADVAN/i, name: "Advan" },
  { test: /^iPad/i, name: "iPad" },
  { test: /^iPhone/i, name: "iPhone" },
];

/** Merk & tipe perangkat, sebisa mungkin dalam bahasa sehari-hari. */
export function friendlyDeviceName(model: string, ua: string): string {
  const m = (model ?? "").trim();
  if (m) {
    const hit = MODEL_RULES.find((r) => r.test.test(m));
    // Kode pabrik tetap ditempel bila merk sudah dikenali, agar tipenya jelas.
    if (hit) return hit.name === m ? hit.name : `${hit.name} (${m})`;
    return m;
  }
  if (/iPad/i.test(ua)) return "iPad";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/Android/i.test(ua)) return "HP / Tablet Android";
  if (/Windows/i.test(ua)) return "Laptop / PC Windows";
  if (/Mac OS X/i.test(ua)) return "Mac";
  if (/CrOS/i.test(ua)) return "Chromebook";
  if (/Linux/i.test(ua)) return "Laptop / PC";
  return "Perangkat";
}

/** Nama peramban singkat, hanya sebagai keterangan tambahan. */
export function browserName(ua: string): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Browser";
}

const CODE_MARK = " #";

/** Gabungkan nama perangkat dengan kode perangkat untuk disimpan. */
export function packDevice(name: string, code: string): string {
  return code ? `${name}${CODE_MARK}${code}` : name;
}

/** Pisahkan kembali nama dan kode perangkat dari data yang tersimpan. */
export function unpackDevice(value: string): { name: string; code: string } {
  const raw = (value ?? "").trim();
  const at = raw.lastIndexOf(CODE_MARK);
  if (at === -1) return { name: raw, code: "" };
  return { name: raw.slice(0, at).trim(), code: raw.slice(at + CODE_MARK.length).trim() };
}
