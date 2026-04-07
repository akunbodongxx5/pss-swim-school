import sharp from "sharp";

/** Isi logo di area tengah ~78% — aman untuk maskable / squircle launcher. */
const SAFE_RATIO = 0.78;
const MAX_INPUT_PIXELS = 4096 * 4096;

function hexToRgba(hex: string): { r: number; g: number; b: number; alpha: number } {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    return { r: 248, g: 250, b: 252, alpha: 1 };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    alpha: 1,
  };
}

/**
 * Logo apa pun → PNG persegi: latar solid + logo di tengah (contain) tanpa letterbox hitam.
 */
export async function renderSquarePwaIcon(
  inputBuffer: Buffer,
  pixelSize: number,
  backgroundHex?: string | null
): Promise<Buffer | null> {
  const size = Math.min(1024, Math.max(48, Math.round(pixelSize)));
  const inner = Math.max(32, Math.round(size * SAFE_RATIO));
  const bg = hexToRgba(backgroundHex || process.env.PWA_ICON_BACKGROUND || "#f8fafc");

  try {
    const resized = await sharp(inputBuffer, {
      limitInputPixels: MAX_INPUT_PIXELS,
      animated: false,
      density: 300,
    })
      .resize(inner, inner, {
        fit: "inside",
        withoutEnlargement: false,
      })
      .png()
      .toBuffer();

    return await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: bg,
      },
    })
      .composite([{ input: resized, gravity: "center" }])
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch {
    return null;
  }
}
