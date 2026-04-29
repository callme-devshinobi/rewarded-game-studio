// Rewarded ad hook — AdSense H5 Games Ads with graceful mock fallback.
// Replace AD_SLOT_ID and uncomment the SDK <script> in index.html when you have
// an approved Google Ad Manager / AdSense H5 Games Ads account and ad unit.
//
// Docs: https://developers.google.com/ad-placement (H5 Games Ads / Ad Placement API)

import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    adsbygoogle?: {
      push: (cmd: Record<string, unknown>) => void;
    } & unknown[];
    adBreak?: (params: AdBreakParams) => void;
    adConfig?: (params: Record<string, unknown>) => void;
  }
}

type AdBreakParams = {
  type: "reward" | "start" | "pause" | "next" | "browse";
  name?: string;
  beforeAd?: () => void;
  afterAd?: () => void;
  beforeReward?: (showAdFn: () => void) => void;
  adDismissed?: () => void;
  adViewed?: () => void;
  adBreakDone?: (placementInfo: { breakStatus: string }) => void;
};

export type AdState = "idle" | "loading" | "playing" | "rewarded" | "dismissed" | "error";

export function useRewardedAd() {
  const [state, setState] = useState<AdState>("idle");
  const [provider, setProvider] = useState<"adsense" | "mock">("mock");

  useEffect(() => {
    // Detect real SDK availability
    if (typeof window !== "undefined" && typeof window.adBreak === "function") {
      setProvider("adsense");
    }
  }, []);

  const showRewardedAd = useCallback(
    (onReward: () => void, onClose?: () => void) => {
      setState("loading");

      // Real AdSense H5 Games Ads (Ad Placement API)
      if (typeof window !== "undefined" && typeof window.adBreak === "function") {
        let earned = false;
        try {
          window.adBreak({
            type: "reward",
            name: "continue-life",
            beforeReward: (showAdFn) => {
              setState("playing");
              showAdFn();
            },
            adViewed: () => {
              earned = true;
              setState("rewarded");
              onReward();
            },
            adDismissed: () => {
              setState("dismissed");
              onClose?.();
            },
            adBreakDone: () => {
              if (!earned) {
                setState("dismissed");
                onClose?.();
              }
            },
          });
          return;
        } catch (e) {
          console.warn("[ads] adBreak failed, falling back to mock", e);
          setState("error");
        }
      }

      // Mock fallback: 4-second simulated rewarded video
      setState("playing");
      const timeout = window.setTimeout(() => {
        setState("rewarded");
        onReward();
      }, 4000);

      return () => window.clearTimeout(timeout);
    },
    []
  );

  const reset = useCallback(() => setState("idle"), []);

  return { state, provider, showRewardedAd, reset };
}
