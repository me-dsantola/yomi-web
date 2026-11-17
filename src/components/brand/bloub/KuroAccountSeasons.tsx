"use client";
import { useEffect } from "react";
import { bindCosmeticAccount } from "@/lib/kuro/store";
import { activeSeason } from "./cosmetics";
export function KuroAccountSeasons({ uid }: { uid: string | null }) {
  useEffect(() => {
    bindCosmeticAccount(uid);
    return () => bindCosmeticAccount(null);
  }, [uid]);
  useEffect(() => {
    const update = () => {
      const event = activeSeason();
      document.documentElement.dataset.kuroSeason = event?.id ?? "";
      document.documentElement.style.setProperty(
        "--kuro-season-accent",
        event?.accent ?? "transparent",
      );
    };
    update();
    const timer = setInterval(update, 60000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      delete document.documentElement.dataset.kuroSeason;
    };
  }, []);
  return (
    <style>{`html[data-kuro-season]:not([data-kuro-season=""]) body::before{content:"";position:fixed;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,var(--kuro-season-accent),transparent);z-index:100;pointer-events:none}`}</style>
  );
}
