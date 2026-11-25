import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/download",
    "/instalar",
    "/explorar",
    "/privacidade",
    "/termos",
  ];

  return routes.map((route) => ({
    url: new URL(route || "/", siteUrl).href,
  }));
}
