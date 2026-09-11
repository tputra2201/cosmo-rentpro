/** Identitas aplikasi yang tampil di header. */
export const APP_NAME = "RentalPro";
export const DEFAULT_APP_VERSION = "v1.0";

/** Contoh hasil: "RentalPro v1.0 - 081282284411" */
export function appSignature(version?: string | null, contact?: string | null) {
  const v = (version ?? "").trim() || DEFAULT_APP_VERSION;
  const c = (contact ?? "").trim();
  return c ? `${APP_NAME} ${v} - ${c}` : `${APP_NAME} ${v}`;
}
