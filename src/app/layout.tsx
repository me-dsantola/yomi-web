import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { YomiNavbar } from "@/components/layout/YomiNavbar";
import { YomiFooter } from "@/components/layout/YomiFooter";
import { CookieConsentBanner } from "@/components/layout/CookieConsentBanner";
import { PageTransitionWrapper } from "@/components/layout/PageTransitionWrapper";
import { fetchLatestYomiRelease } from "@/lib/github/releases";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#070709",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://yomi-reader.vercel.app"
  ),
  title: {
    default: "YOMI — Leitor Minimalista de Mangás, Manhwas e Webtoons",
    template: "%s | YOMI",
  },
  description:
    "Portal Oficial e Companion do aplicativo YOMI para Android. Design AMOLED puro, leitura contínua de Webtoons e Mangás, sincronização na nuvem e catálogo web integrado.",
  applicationName: "YOMI",
  keywords: [
    "YOMI",
    "leitor de mangá",
    "manhwa",
    "webtoon",
    "android apk",
    "mangadex",
    "amoled reader",
  ],
  authors: [{ name: "YOMI Team" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "YOMI Oficial",
    title: "YOMI — Leitor Minimalista de Mangás, Manhwas e Webtoons",
    description:
      "Baixe o APK oficial para Android (sempre atualizado), sincronize sua biblioteca na nuvem e leia pelo navegador.",
  },
  twitter: {
    card: "summary_large_image",
    title: "YOMI — Leitor Minimalista de Mangás, Manhwas e Webtoons",
    description:
      "Baixe o APK oficial para Android (sempre atualizado), sincronize sua biblioteca na nuvem e leia pelo navegador.",
  },
  icons: {
    icon: "/brand/yomi-simbolo-gradiente.svg",
    apple: "/brand/icon-1024.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const latestRelease = await fetchLatestYomiRelease();

  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${outfit.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col bg-[#070709] text-white antialiased selection:bg-[#FF2A55] selection:text-white">
        <AppProviders>
          <YomiNavbar latestVersion={latestRelease.version} />
          <main className="flex-1">
            <PageTransitionWrapper>{children}</PageTransitionWrapper>
          </main>
          <YomiFooter />
          <CookieConsentBanner />
        </AppProviders>
      </body>
    </html>
  );
}
