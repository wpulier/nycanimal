import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tompkins Nature Catalog",
    short_name: "Tompkins",
    description: "A sticker-based field guide for Tompkins Square Park.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3ead3",
    theme_color: "#283a22",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
