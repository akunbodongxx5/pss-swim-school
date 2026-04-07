/** Parse data URL → buffer untuk response gambar (ikon PWA, dll.). */
export function dataUrlToImageBuffer(dataUrl: string): { contentType: string; buffer: Buffer } | null {
  const trimmed = dataUrl.trim();
  const comma = trimmed.indexOf(",");
  if (comma < 5 || !trimmed.toLowerCase().startsWith("data:")) return null;
  const meta = trimmed.slice(5, comma);
  const payload = trimmed.slice(comma + 1);
  const isBase64 = /;base64/i.test(meta);
  const mimeMatch = /^([^;]+)/i.exec(meta);
  const rawMime = mimeMatch?.[1]?.trim().toLowerCase() || "";
  const contentType =
    rawMime === "image/jpg"
      ? "image/jpeg"
      : rawMime.startsWith("image/")
        ? rawMime
        : "application/octet-stream";

  try {
    if (isBase64) {
      return { contentType, buffer: Buffer.from(payload, "base64") };
    }
    return { contentType, buffer: Buffer.from(decodeURIComponent(payload.replace(/\+/g, " ")), "utf8") };
  } catch {
    return null;
  }
}

export function isSupportedPwaImageMime(mime: string): boolean {
  const m = mime.toLowerCase();
  return (
    m === "image/png" ||
    m === "image/jpeg" ||
    m === "image/jpg" ||
    m === "image/webp" ||
    m === "image/svg+xml"
  );
}
