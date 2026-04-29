import { useEffect, useRef, useState, useCallback } from "react";

export type GameStatus = "ready" | "playing" | "gameover";

type Pipe = { x: number; gapY: number; passed: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

// Physics tuned for snappy mobile feel
const GRAVITY = 1500;          // px/s^2
const FLAP_VELOCITY = -420;    // px/s
const PIPE_SPEED = 180;        // px/s
const PIPE_GAP = 170;          // gap height
const PIPE_WIDTH = 70;
const PIPE_INTERVAL = 1.45;    // seconds
const BIRD_RADIUS = 18; // witch hit radius
const BIRD_X = 110;
const GROUND_HEIGHT = 70;

export function useFlappyGame(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const [status, setStatus] = useState<GameStatus>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem("sky-hopper-best") || 0);
  });

  // Mutable game state — kept in refs so the RAF loop doesn't re-render
  const stateRef = useRef({
    status: "ready" as GameStatus,
    birdY: 0,
    birdV: 0,
    rotation: 0,
    pipes: [] as Pipe[],
    particles: [] as Particle[],
    spawnTimer: 0,
    score: 0,
    width: 0,
    height: 0,
    lastTs: 0,
    frame: 0,
  });

  const resetWorld = useCallback((keepScore = false) => {
    const s = stateRef.current;
    s.birdY = s.height / 2;
    s.birdV = 0;
    s.rotation = 0;
    s.pipes = [];
    s.particles = [];
    s.spawnTimer = 0;
    if (!keepScore) {
      s.score = 0;
      setScore(0);
    }
  }, []);

  const start = useCallback(() => {
    stateRef.current.status = "playing";
    setStatus("playing");
    resetWorld();
  }, [resetWorld]);

  const flap = useCallback(() => {
    const s = stateRef.current;
    if (s.status === "ready") {
      start();
    }
    if (s.status === "playing") {
      s.birdV = FLAP_VELOCITY;
      // sparkle/broom-trail particles
      for (let i = 0; i < 5; i++) {
        s.particles.push({
          x: BIRD_X - 14,
          y: s.birdY + 6,
          vx: -50 - Math.random() * 70,
          vy: 10 + Math.random() * 30,
          life: 0.55,
          color: i % 2 ? "hsl(280 90% 70%)" : "hsl(45 100% 65%)",
        });
      }
    }
  }, [start]);

  // Continue from game over — used by rewarded ad reward
  const continueAfterAd = useCallback(() => {
    const s = stateRef.current;
    // Clear nearby pipes so player isn't insta-killed
    s.pipes = s.pipes.filter((p) => p.x > BIRD_X + 180);
    s.birdY = s.height / 2;
    s.birdV = FLAP_VELOCITY * 0.6;
    s.status = "playing";
    setStatus("playing");
  }, []);

  const die = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== "playing") return;
    s.status = "gameover";
    setStatus("gameover");
    // explosion particles
    for (let i = 0; i < 24; i++) {
      const a = (Math.PI * 2 * i) / 24;
      s.particles.push({
        x: BIRD_X,
        y: s.birdY,
        vx: Math.cos(a) * (80 + Math.random() * 80),
        vy: Math.sin(a) * (80 + Math.random() * 80),
        life: 0.8,
        color: i % 2 ? "hsl(45 100% 60%)" : "hsl(330 85% 62%)",
      });
    }
    setBest((prev) => {
      const next = Math.max(prev, s.score);
      if (typeof window !== "undefined") {
        localStorage.setItem("sky-hopper-best", String(next));
      }
      return next;
    });
  }, []);

  // Main RAF loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const s = stateRef.current;
      const wasUninit = s.width === 0;
      s.width = rect.width;
      s.height = rect.height;
      if (wasUninit) {
        s.birdY = rect.height / 2;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    const loop = (ts: number) => {
      const s = stateRef.current;
      if (!s.lastTs) s.lastTs = ts;
      const dt = Math.min(0.033, (ts - s.lastTs) / 1000);
      s.lastTs = ts;
      s.frame++;

      update(s, dt);
      draw(ctx, s);

      raf = requestAnimationFrame(loop);
    };

    const update = (s: typeof stateRef.current, dt: number) => {
      // Particles always update
      s.particles = s.particles.filter((p) => {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 200 * dt;
        return p.life > 0;
      });

      if (s.status === "ready") {
        // Idle bob
        s.birdY = s.height / 2 + Math.sin(s.frame * 0.08) * 8;
        s.rotation = 0;
        return;
      }

      if (s.status !== "playing") return;

      // Bird physics
      s.birdV += GRAVITY * dt;
      s.birdY += s.birdV * dt;
      s.rotation = Math.max(-0.4, Math.min(1.2, s.birdV / 600));

      // Spawn pipes
      s.spawnTimer += dt;
      if (s.spawnTimer >= PIPE_INTERVAL) {
        s.spawnTimer = 0;
        const margin = 60;
        const playArea = s.height - GROUND_HEIGHT - margin * 2 - PIPE_GAP;
        const gapY = margin + Math.random() * playArea;
        s.pipes.push({ x: s.width + 20, gapY, passed: false });
      }

      // Move pipes & scoring
      for (const p of s.pipes) {
        p.x -= PIPE_SPEED * dt;
        if (!p.passed && p.x + PIPE_WIDTH < BIRD_X) {
          p.passed = true;
          s.score++;
          setScore(s.score);
        }
      }
      s.pipes = s.pipes.filter((p) => p.x + PIPE_WIDTH > -20);

      // Collisions
      if (s.birdY + BIRD_RADIUS >= s.height - GROUND_HEIGHT) {
        s.birdY = s.height - GROUND_HEIGHT - BIRD_RADIUS;
        die();
        return;
      }
      if (s.birdY - BIRD_RADIUS <= 0) {
        s.birdY = BIRD_RADIUS;
        s.birdV = 0;
      }
      for (const p of s.pipes) {
        const inX = BIRD_X + BIRD_RADIUS > p.x && BIRD_X - BIRD_RADIUS < p.x + PIPE_WIDTH;
        const inGap = s.birdY - BIRD_RADIUS > p.gapY && s.birdY + BIRD_RADIUS < p.gapY + PIPE_GAP;
        if (inX && !inGap) {
          die();
          return;
        }
      }
    };

    const draw = (ctx: CanvasRenderingContext2D, s: typeof stateRef.current) => {
      const { width: w, height: h } = s;

      // Dusk sky gradient (witchy)
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "hsl(260, 60%, 22%)");
      sky.addColorStop(0.6, "hsl(290, 55%, 40%)");
      sky.addColorStop(1, "hsl(20, 85%, 60%)");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Moon
      ctx.fillStyle = "hsl(50, 100%, 88%)";
      ctx.beginPath();
      ctx.arc(w - 60, 70, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "hsl(260, 60%, 22%)";
      ctx.beginPath();
      ctx.arc(w - 50, 64, 22, 0, Math.PI * 2);
      ctx.fill();

      // Distant clouds (parallax)
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      const cloudOffset = (s.frame * 0.3) % w;
      for (let i = 0; i < 4; i++) {
        const cx = ((i * (w / 3)) - cloudOffset + w) % (w + 100) - 50;
        const cy = 60 + i * 30;
        drawCloud(ctx, cx, cy, 30 + (i % 2) * 10);
      }

      // Pipes
      for (const p of s.pipes) {
        drawPipe(ctx, p.x, 0, PIPE_WIDTH, p.gapY, true);
        drawPipe(ctx, p.x, p.gapY + PIPE_GAP, PIPE_WIDTH, h - GROUND_HEIGHT - (p.gapY + PIPE_GAP), false);
      }

      // Ground
      const groundY = h - GROUND_HEIGHT;
      ctx.fillStyle = "hsl(35, 60%, 50%)";
      ctx.fillRect(0, groundY, w, GROUND_HEIGHT);
      ctx.fillStyle = "hsl(35, 60%, 35%)";
      ctx.fillRect(0, groundY + 14, w, GROUND_HEIGHT - 14);
      // ground stripes
      ctx.fillStyle = "hsl(35, 70%, 60%)";
      const stripeOffset = s.status === "playing" ? (s.frame * 3) % 30 : 0;
      for (let x = -stripeOffset; x < w; x += 30) {
        ctx.fillRect(x, groundY + 4, 16, 6);
      }

      // Particles
      for (const p of s.particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Witch on broomstick
      drawWitch(ctx, BIRD_X, s.birdY, s.rotation, s.frame);

      // Ready overlay hint
      if (s.status === "ready") {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Tap or press Space to fly", w / 2, h / 2 + 80);
      }
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [canvasRef, die]);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap]);

  const restart = useCallback(() => {
    resetWorld();
    stateRef.current.status = "ready";
    setStatus("ready");
  }, [resetWorld]);

  return { status, score, best, flap, restart, continueAfterAd };
}

// ---------- Drawing helpers ----------

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r * 0.8, y + 4, r * 0.8, 0, Math.PI * 2);
  ctx.arc(x - r * 0.8, y + 6, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawPipe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isTop: boolean
) {
  if (h <= 0) return;
  // Body
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, "hsl(130, 65%, 32%)");
  grad.addColorStop(0.4, "hsl(130, 70%, 50%)");
  grad.addColorStop(1, "hsl(130, 65%, 28%)");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Lip (cap on the gap-facing edge)
  const lipH = 18;
  const lipX = x - 4;
  const lipW = w + 8;
  const lipY = isTop ? y + h - lipH : y;
  ctx.fillStyle = "hsl(130, 70%, 28%)";
  ctx.fillRect(lipX, lipY, lipW, lipH);
  ctx.fillStyle = "hsl(130, 80%, 55%)";
  ctx.fillRect(lipX + 4, lipY + 3, lipW - 8, 4);

  // Side highlight
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(x + 6, y, 4, h);
}

function drawWitch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot: number,
  frame: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  // ---------- Broomstick ----------
  // Handle
  ctx.strokeStyle = "hsl(25, 60%, 25%)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-22, 14);
  ctx.lineTo(20, 10);
  ctx.stroke();
  // Handle highlight
  ctx.strokeStyle = "hsl(30, 70%, 45%)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-18, 13);
  ctx.lineTo(18, 9);
  ctx.stroke();

  // Bristles (back of broom)
  const bristlePhase = Math.sin(frame * 0.5) * 1.5;
  ctx.strokeStyle = "hsl(40, 80%, 55%)";
  ctx.lineWidth = 2;
  for (let i = -6; i <= 6; i += 2) {
    ctx.beginPath();
    ctx.moveTo(-22, 14);
    ctx.lineTo(-38 - Math.abs(i) * 0.4, 14 + i + bristlePhase);
    ctx.stroke();
  }
  ctx.strokeStyle = "hsl(30, 70%, 35%)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-22, 8);
  ctx.lineTo(-22, 20);
  ctx.stroke();

  // ---------- Witch body (cloak) ----------
  ctx.fillStyle = "hsl(265, 55%, 25%)";
  ctx.beginPath();
  ctx.moveTo(-10, 12);
  ctx.quadraticCurveTo(-2, -4, 8, 12);
  ctx.quadraticCurveTo(0, 16, -10, 12);
  ctx.fill();

  // Cloak trim
  ctx.fillStyle = "hsl(280, 60%, 45%)";
  ctx.beginPath();
  ctx.ellipse(-1, 12, 10, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // ---------- Head ----------
  ctx.fillStyle = "hsl(95, 35%, 65%)"; // green skin
  ctx.beginPath();
  ctx.arc(0, -6, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "hsl(95, 40%, 30%)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Hair (orange wisp trailing back)
  ctx.fillStyle = "hsl(20, 90%, 55%)";
  ctx.beginPath();
  ctx.moveTo(-5, -4);
  ctx.quadraticCurveTo(-16, 0, -18, 6);
  ctx.quadraticCurveTo(-10, 2, -4, 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = "hsl(215, 60%, 10%)";
  ctx.beginPath();
  ctx.arc(3, -7, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Nose (long witchy)
  ctx.fillStyle = "hsl(95, 35%, 55%)";
  ctx.beginPath();
  ctx.moveTo(6, -6);
  ctx.lineTo(12, -3);
  ctx.lineTo(6, -3);
  ctx.closePath();
  ctx.fill();

  // ---------- Hat ----------
  ctx.fillStyle = "hsl(265, 60%, 18%)";
  // Brim
  ctx.beginPath();
  ctx.ellipse(-1, -12, 12, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cone
  ctx.beginPath();
  ctx.moveTo(-7, -12);
  ctx.lineTo(2, -26);
  ctx.lineTo(6, -12);
  ctx.closePath();
  ctx.fill();
  // Hat band
  ctx.fillStyle = "hsl(45, 100%, 55%)";
  ctx.fillRect(-6, -13.5, 11, 2);
  // Buckle
  ctx.fillStyle = "hsl(45, 100%, 70%)";
  ctx.fillRect(-1, -13.7, 2.5, 2.4);

  ctx.restore();
}
