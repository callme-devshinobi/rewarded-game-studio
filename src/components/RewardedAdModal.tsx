import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, PlayCircle } from "lucide-react";
import { AdState } from "@/hooks/useRewardedAd";
import { useEffect, useState } from "react";

interface RewardedAdModalProps {
  open: boolean;
  state: AdState;
  provider: "adsterra";
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
        <div className="bg-gradient-night p-5 flex flex-col items-center gap-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Sponsored</div>

          <iframe
            title="Adsterra advertisement"
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            srcDoc={`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;display:flex;justify-content:center;overflow:hidden"><script>var atOptions={key:'9d4c92b952dfd78e2f21bc94ea9fe232',format:'iframe',height:60,width:468,params:{}};</script><script src="https://www.highrevenueformat.com/9d4c92b952dfd78e2f21bc94ea9fe232/invoke.js"></script></body></html>`}
            className="h-[60px] w-full max-w-[468px] border-0 bg-background"
          />

          <div className="flex h-10 items-center justify-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            {state === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
            {state === "loading" && "Loading advertisement…"}
            {state === "playing" && `Continue available in ${secondsLeft} seconds`}
            {state === "rewarded" && <><PlayCircle className="h-4 w-4" /> Continue unlocked</>}
            {(state === "dismissed" || state === "error") && "Advertisement unavailable"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
