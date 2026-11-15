import { describe, it, expect } from "vitest";
import { detectDevicePlatform } from "@/lib/device";

describe("Detecção de Dispositivo para Central de Download", () => {
  it("identifica smartphones Android e recomenda arm64-v8a", () => {
    const res = detectDevicePlatform(
      "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36"
    );
    expect(res.platform).toBe("android");
    expect(res.recommendedAbi).toBe("arm64-v8a");
  });

  it("identifica iPhone e iPadOS (incluindo modo Desktop com touch)", () => {
    const iphone = detectDevicePlatform(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15"
    );
    expect(iphone.platform).toBe("ios");

    const ipadDesktopMode = detectDevicePlatform(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
      5
    );
    expect(ipadDesktopMode.platform).toBe("ios");
  });

  it("identifica computadores Desktop (Windows, Linux, macOS sem touch)", () => {
    const win = detectDevicePlatform(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0",
      0
    );
    expect(win.platform).toBe("desktop");
    expect(win.recommendedAbi).toBe("arm64-v8a");
  });
});
