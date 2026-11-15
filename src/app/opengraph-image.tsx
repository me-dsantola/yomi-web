import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "YOMI — Leitor Minimalista de Mangás, Manhwas e Webtoons";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#070709",
          backgroundImage:
            "radial-gradient(circle at 80% 20%, rgba(255, 42, 85, 0.28), transparent 55%), radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.22), transparent 55%)",
          padding: "64px 72px",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #FF2A55, #8B5CF6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              fontWeight: 800,
            }}
          >
            Y
          </div>
          <span
            style={{
              fontSize: "34px",
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            YOMI
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              fontSize: "62px",
              fontWeight: 800,
              lineHeight: 1.08,
              maxWidth: "920px",
            }}
          >
            O Leitor Definitivo de Mangás, Manhwas e Webtoons.
          </div>
          <div
            style={{
              fontSize: "26px",
              color: "rgba(255, 255, 255, 0.68)",
              maxWidth: "820px",
            }}
          >
            AMOLED puro no Android • Sincronização em Nuvem (.kuro v4) • Quick
            Reader Web
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: "24px",
            fontSize: "20px",
            color: "rgba(255, 255, 255, 0.6)",
          }}
        >
          <span>APK Oficial Android (arm64-v8a • armeabi-v7a • x86_64)</span>
          <span style={{ color: "#FF2A55", fontWeight: 700 }}>
            100% Gratuito & Sem Anúncios
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
