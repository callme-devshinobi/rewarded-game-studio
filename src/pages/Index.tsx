import { FlappyGame } from "@/components/FlappyGame";

const Index = () => {
  return (
    <main className="min-h-screen w-full bg-gradient-night flex items-center justify-center p-0 sm:p-6">
      <h1 className="sr-only">Sky Hopper — Flappy Arcade Game with Rewarded Ad Continue</h1>
      <div className="w-full h-screen sm:h-[720px] sm:max-w-[420px] sm:rounded-3xl overflow-hidden sm:shadow-arcade sm:border sm:border-border bg-gradient-sky relative">
        <FlappyGame />
      </div>
    </main>
  );
};

export default Index;
