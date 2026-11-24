"use client";
import { useSyncExternalStore } from "react";
import {
  subscribeCosmetics,
  getCosmetics,
  getServerCosmetics,
} from "@/lib/kuro/store";
export function useCosmetics() {
  return useSyncExternalStore(
    subscribeCosmetics,
    getCosmetics,
    getServerCosmetics,
  );
}
