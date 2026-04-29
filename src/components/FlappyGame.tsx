import { useRef, useState } from "react";
import { useFlappyGame } from "@/hooks/useFlappyGame";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import { Button } from "@/components/ui/button";
import { RewardedAdModal } from "@/components/RewardedAdModal";
import { Trophy, Zap } from "lucide-react";

export function FlappyGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { status, score, best, flap, continueAfterAd } = useFlappyGame(canvasRef);
  const { state: adState, provider, showRewardedAd, reset: resetAd } = useRewardedAd();
  const [adOpen, setAdOpen] = useState(false);

  const handleContinue = () => {
    setAdOpen(true);
    showRewardedAd(
      () => {
        // Reward earned
        window.setTimeout(() => {
          setAdOpen(false);
          resetAd();
          continueAfterAd();
        }, 900);
      },
      () => {
        // Dismissed without reward — stay on game over
        setAdOpen(false);
        resetAd();
      }
    );
  };

  return (
    <div
      className="relative w-full h-full select-none touch-none"
      onPointerDown={(e) => {
        if (status !== "gameover") {
          e.preventDefault();
          flap();
        }
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* HUD: score */}
      {status !== "gameover" && (
        <div className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2">
          <div className="font-arcade text-5xl text-primary-foreground text-stroke-dark drop-shadow-lg">
            {score}
          </div>
        </div>
      )}

      {/* Best badge */}
      <div className="pointer-events-none absolute top-4 right-4 flex items-center gap-1.5 bg-card/80 backdrop-blur px-3 py-1.5 rounded-full border border-border">
        <Trophy className="w-3.5 h-3.5 text-primary" />
        <span className="font-arcade text-xs text-foreground">{best}</span>
      </div>

      {/* Ready CTA (visible above canvas hint) */}
      {status === "ready" && (
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 animate-pop-in">
          <div className="bg-card/90 backdrop-blur px-5 py-2 rounded-full border border-border shadow-arcade">
            <span className="font-arcade text-xs text-primary">WITCH HOPPER</span>
          </div>
        </div>
      )}

      {/* Game Over overlay — only way forward is watching an ad to continue */}
      {status === "gameover" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm p-6">
          <div className="w-full max-w-xs bg-card border border-border rounded-2xl p-6 shadow-arcade animate-pop-in">
            <h2 className="font-arcade text-lg text-center text-accent mb-4">GAME OVER</h2>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-muted rounded-xl p-3 text-center">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Score</div>
                <div className="font-arcade text-2xl text-foreground mt-1">{score}</div>
              </div>
              <div className="bg-muted rounded-xl p-3 text-center">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Best</div>
                <div className="font-arcade text-2xl text-primary mt-1">{best}</div>
              </div>
            </div>

            <Button
              onClick={handleContinue}
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold animate-pulse-glow"
              size="lg"
            >
              <Zap className="w-4 h-4 mr-2 fill-current" />
              Continue (Watch Ad)
            </Button>

            <p className="text-[10px] text-center text-muted-foreground mt-3">
              Watch a short ad to keep flying.
            </p>
          </div>
        </div>
      )}

      <RewardedAdModal open={adOpen} state={adState} provider={provider} />
    </div>
  );
}
