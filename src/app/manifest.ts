import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/viabilidade",
    name: "Viabilidade",
    short_name: "Viabilidade",
    description: "Coleta e análise de produtos na feira.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "pt-BR",
    background_color: "#f3f5f8",
    theme_color: "#0b3a82",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
