import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #1d4ed8, #3b82f6)",
          borderRadius: 96,
          color: "white",
          fontSize: 240,
          fontWeight: 700,
          letterSpacing: -4,
        }}
      >
        P
      </div>
    ),
    { ...size }
  );
}
