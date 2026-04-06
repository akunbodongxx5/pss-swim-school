import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PSS Swim School",
    short_name: "PSS Swim",
    description: "Schedule, students, and coaches for swim school",
    start_url: "/jadwal",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f0f4fb",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icon",
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
    ],
  };
}
