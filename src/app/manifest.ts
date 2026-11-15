import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YOMI — Leitor de Mangás, Manhwas e Webtoons",
    short_name: "YOMI",
    description:
      "Portal Oficial e Companion do aplicativo YOMI para Android com catálogo web e sincronização na nuvem.",
    start_url: "/",
    display: "standalone",
    background_color: "#070709",
    theme_color: "#070709",
    icons: [
      {
        src: "/brand/icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}
