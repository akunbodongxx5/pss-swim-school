const MAX_NAME_LEN = 100;
/** Batas ukuran string data URL (base64) — ~135 KB file asli PNG tipikal */
const MAX_DATA_URL_LEN = 200_000;

const ALLOWED_PREFIXES = [
  "data:image/png;base64,",
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
  "data:image/webp;base64,",
  "data:image/svg+xml;base64,",
];

function isAllowedLogoDataUrl(s: string): boolean {
  if (ALLOWED_PREFIXES.some((p) => s.startsWith(p))) return true;
  return /^data:image\/svg\+xml[^,]*,/i.test(s);
}

export function validateSchoolName(name: unknown): string | { error: string } {
  if (typeof name !== "string") return { error: "schoolName_invalid" };
  const t = name.trim();
  if (t.length < 2) return { error: "schoolName_too_short" };
  if (t.length > MAX_NAME_LEN) return { error: "schoolName_too_long" };
  return t;
}

export function validateLogoDataUrl(url: unknown): string | null | { error: string } {
  if (url === null || url === undefined || url === "") return null;
  if (typeof url !== "string") return { error: "logo_invalid" };
  const s = url.trim();
  if (s.length > MAX_DATA_URL_LEN) return { error: "logo_too_large" };
  if (!isAllowedLogoDataUrl(s)) return { error: "logo_format" };
  return s;
}
