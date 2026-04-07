/** Selaras dengan latar ikon PWA (`PWA_ICON_BACKGROUND` / default). */
export function pwaSplashBackgroundHex(): string {
  const e = process.env.PWA_ICON_BACKGROUND?.trim();
  return e && /^#[0-9a-fA-F]{6}$/i.test(e) ? e : "#f8fafc";
}
