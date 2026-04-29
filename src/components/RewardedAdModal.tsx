import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, PlayCircle } from "lucide-react";
import { AdState } from "@/hooks/useRewardedAd";
import { useEffect, useState } from "react";

interface RewardedAdModalProps {
  open: boolean;
  state: AdState;
  provider: "adsense" | "mock";
}

export function RewardedAdModal({ open, state, provider }: RewardedAdModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(4);

  useEffect(() => {
    if (state !== "playing") {
      setSecondsLeft(4);
      return;
    }
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [state]);

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm border-border bg-card p-0 overflow-hidden [&>button]:hidden">
        <div className="bg-gradient-night p-6 flex flex-col items-center gap-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {provider === "adsense" ? "Sponsored" : "Demo Ad"}
          </div>

          <div className="w-full aspect-video rounded-xl bg-gradient-primary shadow-arcade flex items-center justify-center relative overflow-hidden">
            {state === "loading" && (
              <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
            )}
            {state === "playing" && (
              <div className="text-center text-primary-foreground">
                <PlayCircle className="w-12 h-12 mx-auto mb-2 animate-pulse" />
                <div className="font-arcade text-sm">YOUR AD HERE</div>
                <div className="text-xs mt-1 opacity-80">
                  {secondsLeft > 0 ? `${secondsLeft}s remaining` : "Almost done…"}
                </div>
              </div>
            )}
            {state === "rewarded" && (
              <div className="text-center text-primary-foreground font-arcade text-sm animate-pop-in">
                ✓ REWARD EARNED
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {provider === "mock"
              ? "Wire up Google AdSense H5 Games Ads in index.html to serve real rewarded ads."
              : "Watch the full ad to receive your reward."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
