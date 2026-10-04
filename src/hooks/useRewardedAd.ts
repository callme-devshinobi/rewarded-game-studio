// Rewarded ad hook — AdSense H5 Games Ads with graceful mock fallback.
// Replace AD_SLOT_ID and uncomment the SDK <script> in index.html when you have
// an approved Google Ad Manager / AdSense H5 Games Ads account and ad unit.
//
// Docs: https://developers.google.com/ad-placement (H5 Games Ads / Ad Placement API)

import { useCallback, useState } from "react";

export type AdState = "idle" | "loading" | "playing" | "rewarded" | "dismissed" | "error";

export function useRewardedAd() {
  const [state, setState] = useState<AdState>("idle");
  const provider = "adsterra" as const;

  const showRewardedAd = useCallback(
    (onReward: () => void, onClose?: () => void) => {
      setState("loading");
      window.setTimeout(() => setState("playing"), 250);
      window.setTimeout(() => {
        setState("rewarded");
        onReward();
      }, 4000);

      return () => {
        setState("dismissed");
        onClose?.();
      };
    },
    []
  );

  const reset = useCallback(() => setState("idle"), []);

  return { state, provider, showRewardedAd, reset };
}
