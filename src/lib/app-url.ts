/**
 * Alamat publik aplikasi untuk tautan email (undangan / atur ulang sandi).
 * Domain editor/pratinjau Lovable butuh izin pemilik proyek, jadi tautan email
 * selalu diarahkan ke alamat publik aplikasi. Bila aplikasi sudah dipindah ke
 * domain sendiri, isi VITE_PUBLIC_APP_URL agar tautan memakai domain itu.
 */
export const PUBLIC_APP_URL =
  (import.meta.env["VITE_PUBLIC_APP_URL"] as string | undefined)?.replace(/\/+$/, "") ||
  "https://cosmo-rentpro.lovable.app";

function isEditorHost(host: string) {
  return (
    host.includes("lovableproject.com") ||
    host.includes("lovable.dev") ||
    host.includes("lovable.app") && host.startsWith("id-preview--") ||
    host.startsWith("id-preview--") ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}

/** Alamat dasar publik aplikasi (tanpa garis miring di akhir). */
export function publicAppBase() {
  if (typeof window === "undefined") return PUBLIC_APP_URL;
  return isEditorHost(window.location.hostname)
    ? PUBLIC_APP_URL
    : window.location.origin.replace(/\/+$/, "");
}

/** Tautan tujuan setelah staf menerima undangan atau memulihkan sandi. */
export function passwordSetupUrl() {
  return `${publicAppBase()}/atur-sandi`;
}
