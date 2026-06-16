import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Heart, RotateCcw, Sparkles, Trophy, X, HelpCircle } from "lucide-react";
import { Orca } from "./Orca";

type LaneKind = "dolphin" | "sailboat" | "shark" | "ferry" | "yacht";

type LaneConfig = {
  kind: LaneKind;
  emoji: string;
  label: string;
  points: number;
  speed: number; // cells/sec
  dir: 1 | -1;
  width: number; // cells
  spawnEvery: number; // seconds
  maxOnScreen?: number;
};

type Obstacle = {
  id: number;
  lane: number; // 1..5
  x: number; // cell position of left edge
  width: number;
  dir: 1 | -1;
  speed: number;
  kind: LaneKind;
  emoji: string;
  points: number;
};

type Particle = { id: number; x: number; y: number; life: number; vx: number; vy: number };
type PodStrike = { id: number; fromX: number; fromY: number; toX: number; toY: number; phase: "start" | "impact" };

const POD_STRIKE_MS = 550;

const COLS = 9;
const LANES = 5;
const ROWS = LANES + 2; // top inlets row + 5 lanes + bottom dock
const INLET_ROW = 0;
const DOCK_ROW = ROWS - 1;
const INLETS = 5;
const START_TRIES = 5;
const START_HEALTH = 3;
const POD_COST = 100;
const INVULN_AFTER_HIT = 1.0; // seconds
const TRIDENT_INTERVAL = 2.2; // seconds

const LANE_CONFIGS: LaneConfig[] = [
  // lane index 0 == bottom-most lane (lane 1 in spec, dolphin)
  { kind: "dolphin", emoji: "🐬", label: "Dolphin", points: 5, speed: 1.2, dir: 1, width: 1, spawnEvery: 3.0, maxOnScreen: 3 },
  { kind: "sailboat", emoji: "⛵", label: "Sailboat", points: 10, speed: 1.65, dir: -1, width: 1, spawnEvery: 2.0 },
  { kind: "shark", emoji: "🦈", label: "Shark", points: 15, speed: 2.25, dir: 1, width: 1, spawnEvery: 1.6 },
  { kind: "ferry", emoji: "⛴️", label: "Ferry", points: 20, speed: 0.9, dir: -1, width: 2, spawnEvery: 3.2 },
  { kind: "yacht", emoji: "🛥️", label: "Yacht", points: 100, speed: 2.85, dir: 1, width: 1, spawnEvery: 6.5 },
];

// lane index in obstacle: 1..5, where 1 = bottom (row ROWS-2), 5 = top lane (row 1)
function laneToRow(lane: number) {
  // lane 1 -> ROWS-2 (just above dock), lane 5 -> 1 (just below inlets)
  return DOCK_ROW - lane;
}

export function OrcaDashGame({ onExit }: { onExit: () => void }) {
  const [showHelp, setShowHelp] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [tries, setTries] = useState(START_TRIES);
  const [health, setHealth] = useState(START_HEALTH);
  const [gameOver, setGameOver] = useState(false);
  const [filledInlets, setFilledInlets] = useState<Set<number>>(new Set());
  const [orca, setOrca] = useState<{ col: number; row: number }>({ col: Math.floor(COLS / 2), row: DOCK_ROW });
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [podStrikes, setPodStrikes] = useState<PodStrike[]>([]);
  const [tridents, setTridents] = useState<Set<number>>(new Set()); // inlet indexes 0..INLETS-1
  const [flash, setFlash] = useState(0);
  const [, force] = useState(0);

  const obstacleIdRef = useRef(0);
  const particleIdRef = useRef(0);
  const lastSpawnRef = useRef<number[]>(LANE_CONFIGS.map(() => 0));
  const lastTridentRef = useRef(0);
  const lastFinalTridentRef = useRef(-Infinity);
  const tridentElapsedRef = useRef(0);
  const invulnRef = useRef(0);
  const podActiveRef = useRef(false);
  const orcaRef = useRef(orca);
  const obstaclesRef = useRef(obstacles);
  const tridentsRef = useRef(tridents);
  const filledRef = useRef(filledInlets);
  const healthRef = useRef(health);
  const triesRef = useRef(tries);
  const scoreRef = useRef(score);
  const gameOverRef = useRef(gameOver);
  const showHelpRef = useRef(showHelp);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => { orcaRef.current = orca; }, [orca]);
  useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);
  useEffect(() => { tridentsRef.current = tridents; }, [tridents]);
  useEffect(() => { filledRef.current = filledInlets; }, [filledInlets]);
  useEffect(() => { healthRef.current = health; }, [health]);
  useEffect(() => { triesRef.current = tries; }, [tries]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { showHelpRef.current = showHelp; }, [showHelp]);

  // Load high score
  useEffect(() => {
    try {
      const v = localStorage.getItem("orca-dash-highscore");
      if (v) setHighScore(parseInt(v, 10) || 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      try { localStorage.setItem("orca-dash-highscore", String(score)); } catch {}
    }
  }, [score, highScore]);

  const reset = useCallback((full: boolean) => {
    setOrca({ col: Math.floor(COLS / 2), row: DOCK_ROW });
    setHealth(START_HEALTH);
    invulnRef.current = INVULN_AFTER_HIT;
    if (full) {
      setScore(0);
      setTries(START_TRIES);
      setObstacles([]);
      setParticles([]);
      setTridents(new Set());
      setFilledInlets(new Set());
      setGameOver(false);
      lastSpawnRef.current = LANE_CONFIGS.map(() => 0);
      lastTridentRef.current = 0;
    }
  }, []);

  const respawn = useCallback(() => {
    setOrca({ col: Math.floor(COLS / 2), row: DOCK_ROW });
    setHealth(START_HEALTH);
    invulnRef.current = INVULN_AFTER_HIT;
    setFlash(0.4);
  }, []);

  const loseLife = useCallback(() => {
    const t = triesRef.current - 1;
    setTries(t);
    if (t <= 0) {
      setGameOver(true);
    } else {
      respawn();
    }
  }, [respawn]);

  const takeHit = useCallback(() => {
    if (invulnRef.current > 0) return;
    invulnRef.current = INVULN_AFTER_HIT;
    setFlash(0.3);
    const h = healthRef.current - 1;
    setHealth(h);
    if (h <= 0) {
      loseLife();
    }
  }, [loseLife]);

  const spawnParticles = useCallback((x: number, y: number) => {
    const newParts: Particle[] = [];
    for (let i = 0; i < 10; i++) {
      newParts.push({
        id: ++particleIdRef.current,
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 0.6,
      });
    }
    setParticles((p) => [...p, ...newParts]);
  }, []);

  const move = useCallback((dCol: number, dRow: number) => {
    if (gameOverRef.current || showHelpRef.current) return;
    const cur = orcaRef.current;
    let nc = cur.col + dCol;
    let nr = cur.row + dRow;
    if (nc < 0 || nc >= COLS) return;
    if (nr < 0 || nr > DOCK_ROW) return;

    // Determine if we're moving vertically into an obstacle (ram from below or above)
    let rammed = false;
    if ((dRow === -1 || dRow === 1) && nr >= 1 && nr <= LANES) {
      const laneNum = DOCK_ROW - nr; // 1..LANES (matches obstacle.lane)
      const hit = obstaclesRef.current.find(o => {
        if (o.lane !== laneNum) return false;
        const left = o.x;
        const right = o.x + o.width;
        // overlap test against the cell the orca is entering [nc, nc+1)
        return right > nc && left < nc + 1;
      });
      if (hit) {
        rammed = true;
        setObstacles(list => list.filter(o => o.id !== hit.id));
        setScore(s => s + hit.points);
        spawnParticles(nc + 0.5, nr + 0.5);
      }
    }

    setOrca({ col: nc, row: nr });

    // Reached inlets row
    if (nr === INLET_ROW) {
      // Determine which inlet (5 slots distributed across 9 cols)
      const inletIdx = Math.round((nc / (COLS - 1)) * (INLETS - 1));
      const inletCol = Math.round((inletIdx / (INLETS - 1)) * (COLS - 1));
      if (Math.abs(nc - inletCol) <= 1) {
        // Trident penalty
        if (tridentsRef.current.has(inletIdx)) {
          takeHit();
          setOrca({ col: Math.floor(COLS / 2), row: DOCK_ROW });
        } else if (filledRef.current.has(inletIdx)) {
          // already filled, bounce back
          setOrca({ col: Math.floor(COLS / 2), row: DOCK_ROW });
        } else {
          const next = new Set(filledRef.current);
          next.add(inletIdx);
          setFilledInlets(next);
          setScore(s => s + 50);
          setOrca({ col: Math.floor(COLS / 2), row: DOCK_ROW });
          if (next.size >= INLETS) {
            // round complete - bonus + reset inlets
            setScore(s => s + 500);
            setTimeout(() => setFilledInlets(new Set()), 600);
          }
        }
      } else {
        // not at an inlet, bounce back
        setOrca({ col: nc, row: 1 });
      }
    }

    return rammed;
  }, [spawnParticles, takeHit]);

  const callPod = useCallback(() => {
    if (gameOverRef.current || showHelpRef.current) return;
    if (podActiveRef.current) return;
    if (scoreRef.current < POD_COST) return;
    const list = obstaclesRef.current;
    if (list.length === 0) {
      setScore(s => s - POD_COST);
      return;
    }
    setScore(s => s - POD_COST);
    podActiveRef.current = true;
    const oc = orcaRef.current;
    const strikes: PodStrike[] = list.map((o, i) => ({
      id: ++particleIdRef.current,
      fromX: oc.col + 0.5,
      fromY: oc.row + 0.5,
      toX: o.x + o.width / 2,
      toY: laneToRow(o.lane) + 0.5,
      phase: "start",
    }));
    setPodStrikes(strikes);
    // Kick off transition on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPodStrikes(ss => ss.map(s => ({ ...s, phase: "impact" })));
      });
    });
    // Snapshot targets so we can score even if obstacles array is replaced
    const targets = list.map(o => ({ id: o.id, points: o.points, x: o.x + o.width / 2, y: laneToRow(o.lane) + 0.5 }));
    setTimeout(() => {
      let totalPts = 0;
      targets.forEach(t => {
        totalPts += t.points;
        spawnParticles(t.x, t.y);
      });
      setScore(s => s + totalPts);
      setObstacles([]);
      setPodStrikes([]);
      podActiveRef.current = false;
    }, POD_STRIKE_MS);
  }, [spawnParticles]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showHelpRef.current) {
        if (e.key === "Enter" || e.key === "Escape" || e.key === " ") {
          e.preventDefault();
          setShowHelp(false);
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (["arrowup","arrowdown","arrowleft","arrowright"," ","w","a","s","d"].includes(k)) e.preventDefault();
      if (k === "arrowup" || k === "w") move(0, -1);
      else if (k === "arrowdown" || k === "s") move(0, 1);
      else if (k === "arrowleft" || k === "a") move(-1, 0);
      else if (k === "arrowright" || k === "d") move(1, 0);
      else if (k === " ") callPod();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, callPod]);

  // Game loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!showHelpRef.current && !gameOverRef.current && !podActiveRef.current) {
        invulnRef.current = Math.max(0, invulnRef.current - dt);
        setFlash(f => Math.max(0, f - dt));

        // Move obstacles
        const next: Obstacle[] = [];
        for (const o of obstaclesRef.current) {
          const nx = o.x + o.dir * o.speed * dt;
          if (o.dir === 1 && nx > COLS + 1) continue;
          if (o.dir === -1 && nx + o.width < -1) continue;
          next.push({ ...o, x: nx });
        }

        // Spawn
        for (let i = 0; i < LANE_CONFIGS.length; i++) {
          lastSpawnRef.current[i] += dt;
          const cfg = LANE_CONFIGS[i];
          if (lastSpawnRef.current[i] >= cfg.spawnEvery + Math.random() * 0.6) {
            const inLane = next.filter(o => o.lane === i + 1).length;
            if (cfg.maxOnScreen !== undefined && inLane >= cfg.maxOnScreen) {
              // hold off spawning; retry next frame
              lastSpawnRef.current[i] = cfg.spawnEvery * 0.5;
              continue;
            }
            lastSpawnRef.current[i] = 0;
            const startX = cfg.dir === 1 ? -cfg.width : COLS;
            next.push({
              id: ++obstacleIdRef.current,
              lane: i + 1,
              x: startX,
              width: cfg.width,
              dir: cfg.dir,
              speed: cfg.speed,
              kind: cfg.kind,
              emoji: cfg.emoji,
              points: cfg.points,
            });
          }
        }
        obstaclesRef.current = next;
        setObstacles(next);

        // Collision (side)
        const oc = orcaRef.current;
        if (oc.row >= 1 && oc.row <= LANES) {
          const lane = DOCK_ROW - oc.row;
          for (const o of next) {
            if (o.lane === lane + 1) {
              if (oc.col >= o.x && oc.col < o.x + o.width) {
                takeHit();
                break;
              }
            }
          }
        }

        // Particles
        setParticles(ps => ps
          .map(p => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, life: p.life - dt }))
          .filter(p => p.life > 0));

        // Tridents — at most one active at a time; final inlet has 5s cooldown
        tridentElapsedRef.current += dt;
        lastTridentRef.current += dt;
        if (lastTridentRef.current > TRIDENT_INTERVAL) {
          lastTridentRef.current = 0;
          setTridents(prev => {
            if (prev.size > 0) {
              return new Set(); // hide the active trident
            }
            const FINAL = INLETS - 1;
            const cooling = tridentElapsedRef.current - lastFinalTridentRef.current < 5;
            const pool: number[] = [];
            for (let i = 0; i < INLETS; i++) {
              if (i === FINAL && cooling) continue;
              pool.push(i);
            }
            const idx = pool[Math.floor(Math.random() * pool.length)];
            if (idx === FINAL) lastFinalTridentRef.current = tridentElapsedRef.current;
            return new Set([idx]);
          });
        }
      }
      force(n => (n + 1) % 1000000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [takeHit]);

  const cellPct = 100 / COLS;
  const rowPct = 100 / ROWS;

  const canCallPod = score >= POD_COST && !gameOver && !showHelp;

  return (
    <div className="min-h-screen px-3 sm:px-6 pb-8 select-none" style={{ touchAction: "none" }}>
      <header className="mx-auto max-w-3xl pt-6 flex items-center justify-between gap-3">
        <button onClick={onExit} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" /> Hub
        </button>
        <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">Orca Dash 🌊</h1>
        <button onClick={() => setShowHelp(true)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <HelpCircle className="size-4" /> How to play
        </button>
      </header>

      <div className="mx-auto max-w-3xl mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
          <div className="font-display text-lg font-semibold">{score}</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tries</div>
          <div className="font-display text-lg font-semibold">{tries} / {START_TRIES}</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">High Score</div>
          <div className="font-display text-lg font-semibold">{highScore}</div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl mt-2 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: START_HEALTH }).map((_, i) => (
            <Heart key={i} className={`size-5 ${i < health ? "fill-red-500 text-red-500" : "text-muted-foreground/40"}`} />
          ))}
        </div>
        <button
          onClick={callPod}
          disabled={!canCallPod}
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold border transition-all",
            canCallPod
              ? "border-cyan-accent/60 bg-cyan-accent/10 text-cyan-accent hover:bg-cyan-accent/20 shadow-[var(--shadow-glow)]"
              : "border-border/40 bg-muted/30 text-muted-foreground cursor-not-allowed",
          ].join(" ")}
        >
          <Sparkles className="size-3.5" /> Call Pod (−{POD_COST})
        </button>
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        className="mx-auto max-w-3xl mt-3 relative rounded-2xl overflow-hidden border border-border/60"
        style={{
          aspectRatio: `${COLS} / ${ROWS}`,
          background: "linear-gradient(180deg, oklch(0.32 0.06 220) 0%, oklch(0.18 0.04 235) 50%, oklch(0.22 0.05 230) 100%)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Lane bands */}
        {Array.from({ length: ROWS }).map((_, r) => {
          let bg = "transparent";
          if (r === INLET_ROW) bg = "linear-gradient(180deg, oklch(0.35 0.08 175) 0%, oklch(0.28 0.06 175) 100%)";
          else if (r === DOCK_ROW) bg = "linear-gradient(180deg, oklch(0.45 0.09 75) 0%, oklch(0.35 0.08 75) 100%)";
          else if (r % 2 === 0) bg = "oklch(1 0 0 / 0.03)";
          return (
            <div key={r} className="absolute left-0 right-0" style={{ top: `${r * rowPct}%`, height: `${rowPct}%`, background: bg }} />
          );
        })}

        {/* Inlets */}
        {Array.from({ length: INLETS }).map((_, i) => {
          const col = Math.round((i / (INLETS - 1)) * (COLS - 1));
          const filled = filledInlets.has(i);
          const trident = tridents.has(i);
          return (
            <div key={i}
              className="absolute grid place-items-center"
              style={{
                left: `${col * cellPct}%`,
                top: `0%`,
                width: `${cellPct}%`,
                height: `${rowPct}%`,
              }}
            >
              <div className={`grid place-items-center w-[80%] h-[80%] rounded-md text-2xl ${filled ? "bg-success/30 border border-success/60" : "bg-background/30 border border-border/40"}`}>
                {filled ? <Orca size="80%" /> : trident ? "🔱" : ""}
              </div>
            </div>
          );
        })}

        {/* Obstacles */}
        {obstacles.map(o => {
          const row = laneToRow(o.lane);
          return (
            <div key={o.id}
              className="absolute grid place-items-center pointer-events-none"
              style={{
                left: `${o.x * cellPct}%`,
                top: `${row * rowPct}%`,
                width: `${o.width * cellPct}%`,
                height: `${rowPct}%`,
                fontSize: "clamp(20px, 4.5vw, 38px)",
                transform: o.dir === -1 ? "scaleX(-1)" : undefined,
                transition: "none",
              }}
            >
              <span>{o.emoji}</span>
            </div>
          );
        })}

        {/* Orca */}
        <div
          className="absolute pointer-events-none grid place-items-center"
          style={{
            left: `${orca.col * cellPct}%`,
            top: `${orca.row * rowPct}%`,
            width: `${cellPct}%`,
            height: `${rowPct}%`,
            transition: "left 0.08s ease-out, top 0.08s ease-out",
            filter: invulnRef.current > 0 ? "drop-shadow(0 0 8px var(--cyan-accent))" : undefined,
            opacity: invulnRef.current > 0 ? 0.7 : 1,
            zIndex: 10,
          }}
        >
          <Orca style={{ width: "88%", height: "88%", display: "block" }} />
        </div>

        {/* Particles */}
        {particles.map(p => (
          <div key={p.id} className="absolute rounded-full pointer-events-none"
            style={{
              left: `${p.x * cellPct}%`,
              top: `${p.y * rowPct}%`,
              width: 6, height: 6,
              background: "var(--cyan-accent)",
              opacity: p.life,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}

        {/* Pod strikes */}
        {podStrikes.map(s => {
          const cur = s.phase === "impact" ? { x: s.toX, y: s.toY } : { x: s.fromX, y: s.fromY };
          const dx = s.toX - s.fromX;
          const dy = s.toY - s.fromY;
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const scaleX = dx < 0 ? -1 : 1;
          return (
            <div key={s.id}
              className="absolute pointer-events-none"
              style={{
                left: `${(cur.x - 0.5) * cellPct}%`,
                top: `${(cur.y - 0.5) * rowPct}%`,
                width: `${cellPct}%`,
                height: `${rowPct}%`,
                padding: "8%",
                boxSizing: "border-box",
                transform: `rotate(${scaleX === -1 ? 180 - angle : angle}deg) scaleX(${scaleX})`,
                transition: `left ${POD_STRIKE_MS}ms cubic-bezier(0.4, 0, 0.9, 1), top ${POD_STRIKE_MS}ms cubic-bezier(0.4, 0, 0.9, 1)`,
                filter: "drop-shadow(0 0 8px var(--cyan-accent))",
                zIndex: 5,
              }}
            >
              <Orca style={{ width: "100%", height: "100%", display: "block" }} />
            </div>
          );
        })}

        {/* Flash overlay */}
        {flash > 0 && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: "oklch(0.62 0.22 25)", opacity: flash * 0.5 }} />
        )}

        {/* Game Over */}
        {gameOver && (
          <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur">
            <div className="text-center p-6 rounded-2xl border border-border/60 bg-card animate-pop">
              <Trophy className="size-10 mx-auto text-cyan-accent" />
              <h2 className="font-display text-2xl font-semibold mt-2">Game Over</h2>
              <p className="text-sm text-muted-foreground mt-1">Final score: <span className="text-foreground font-semibold">{score}</span></p>
              <button onClick={() => reset(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-ocean-foreground" style={{ background: "var(--gradient-ocean)" }}>
                <RotateCcw className="size-4" /> Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="mx-auto max-w-3xl mt-4 sm:hidden grid grid-cols-2 gap-3 items-end">
        <div className="grid grid-cols-3 gap-1.5 justify-items-center">
          <div />
          <DpadBtn onPress={() => move(0, -1)} label="↑" />
          <div />
          <DpadBtn onPress={() => move(-1, 0)} label="←" />
          <DpadBtn onPress={() => move(0, 1)} label="↓" />
          <DpadBtn onPress={() => move(1, 0)} label="→" />
        </div>
        <button
          onTouchStart={(e) => { e.preventDefault(); callPod(); }}
          onClick={callPod}
          disabled={!canCallPod}
          className={[
            "h-20 rounded-2xl text-sm font-bold border transition-all",
            canCallPod
              ? "border-cyan-accent/60 bg-cyan-accent/15 text-cyan-accent shadow-[var(--shadow-glow)]"
              : "border-border/40 bg-muted/30 text-muted-foreground",
          ].join(" ")}
        >
          🌊 Call Pod
        </button>
      </div>

      <p className="hidden sm:block text-center text-xs text-muted-foreground mt-4">
        Arrows / WASD to move · Spacebar to Call the Pod · Ram from below or above for points
      </p>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 backdrop-blur px-4">
          <div className="max-w-md w-full rounded-2xl border border-border/70 bg-card p-6 animate-pop relative">
            <button onClick={() => setShowHelp(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
            <h2 className="font-display text-2xl font-semibold flex items-center gap-2"><Orca size={32} /> Orca Dash</h2>
            <p className="text-sm text-muted-foreground mt-1">Cross the ocean lanes to reach the safe pod inlets at the top — and watch out for Tridents (🔱) blocking the goals!</p>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className="font-semibold mb-1">How to Score</div>
                <p className="text-muted-foreground">Avoid side impacts, but <span className="text-foreground font-semibold">ram obstacles from below or above</span> to destroy them and rack up major points.</p>
              </div>
              <div>
                <div className="font-semibold mb-1">Scoring</div>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>🐬 Dolphin — 5 pts</li>
                  <li>⛵ Sailboat — 10 pts</li>
                  <li>🦈 Shark — 15 pts</li>
                  <li>⛴️ Ferry — 20 pts</li>
                  <li>🛥️ Yacht — 100 pts (rare!)</li>
                  <li className="flex items-center gap-1"><Orca size={18} /> Safe inlet — 50 pts (+500 bonus for a full pod)</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold mb-1">Survival</div>
                <p className="text-muted-foreground">3 hits per try, 5 tries before Game Over.</p>
              </div>
              <div>
                <div className="font-semibold mb-1">Call the Pod</div>
                <p className="text-muted-foreground">Spend 100 points to summon your family pod and clear the screen.</p>
              </div>
              <div>
                <div className="font-semibold mb-1">Controls</div>
                <p className="text-muted-foreground">Desktop: Arrows / WASD · Spacebar = Call Pod. Mobile: on-screen D-pad + Pod button.</p>
              </div>
              <p className="text-xs text-muted-foreground/80">Best on screens at least 360px wide. For the smoothest ride, play in portrait on mobile or a window ≥ 480px tall.</p>
            </div>

            <button onClick={() => setShowHelp(false)} className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-ocean-foreground" style={{ background: "var(--gradient-ocean)" }}>
              Dive In →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DpadBtn({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); onPress(); }}
      onClick={onPress}
      className="size-14 rounded-2xl border border-border/60 bg-card/70 backdrop-blur text-xl font-bold text-foreground/90 active:scale-95 active:bg-cyan-accent/20 transition-transform"
    >
      {label}
    </button>
  );
}
