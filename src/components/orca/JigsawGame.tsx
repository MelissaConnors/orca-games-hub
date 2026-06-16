import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import arcticOrcas from "@/assets/arctic-orcas.png";

const N = 5;
const TAB_RATIO = 0.22;

type Edge = -1 | 0 | 1;
type EdgesData = { h: Edge[][]; v: Edge[][] }; // h[r][c] between row r/r+1; v[r][c] between col c/c+1
type PieceDef = {
  id: number;
  row: number;
  col: number;
  path: string;
};
type PieceState = { x: number; y: number; locked: boolean; z: number };

function generateEdges(): EdgesData {
  const rnd = (): Edge => (Math.random() < 0.5 ? 1 : -1);
  const h: Edge[][] = [];
  for (let r = 0; r < N - 1; r++) h.push(Array.from({ length: N }, rnd));
  const v: Edge[][] = [];
  for (let r = 0; r < N; r++) v.push(Array.from({ length: N - 1 }, rnd));
  return { h, v };
}

function edgeSeg(
  edge: Edge,
  fx: number,
  fy: number,
  ox: number,
  oy: number,
  s: number,
  t: number,
): string {
  const add = (a: number, b: number): [number, number] => [
    a * fx + b * ox,
    a * fy + b * oy,
  ];
  if (edge === 0) {
    const [x, y] = add(s, 0);
    return ` l ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  const d = edge;
  const p1 = add(0.4 * s, 0);
  const c1 = add(0.42 * s, d * 1.9 * t);
  const c2 = add(0.58 * s, d * 1.9 * t);
  const p2 = add(0.6 * s, 0);
  const p3 = add(s, 0);
  const cc1: [number, number] = [c1[0] - p1[0], c1[1] - p1[1]];
  const cc2: [number, number] = [c2[0] - p1[0], c2[1] - p1[1]];
  const pp2: [number, number] = [p2[0] - p1[0], p2[1] - p1[1]];
  const pp3: [number, number] = [p3[0] - p2[0], p3[1] - p2[1]];
  return (
    ` l ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}` +
    ` c ${cc1[0].toFixed(2)} ${cc1[1].toFixed(2)}, ${cc2[0].toFixed(2)} ${cc2[1].toFixed(2)}, ${pp2[0].toFixed(2)} ${pp2[1].toFixed(2)}` +
    ` l ${pp3[0].toFixed(2)} ${pp3[1].toFixed(2)}`
  );
}

function buildDefs(edges: EdgesData, cell: number, tab: number): PieceDef[] {
  const list: PieceDef[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const top: Edge = r === 0 ? 0 : ((-edges.h[r - 1][c]) as Edge);
      const bottom: Edge = r === N - 1 ? 0 : edges.h[r][c];
      const left: Edge = c === 0 ? 0 : ((-edges.v[r][c - 1]) as Edge);
      const right: Edge = c === N - 1 ? 0 : edges.v[r][c];
      let d = `M ${tab} ${tab}`;
      d += edgeSeg(top, 1, 0, 0, -1, cell, tab);
      d += edgeSeg(right, 0, 1, 1, 0, cell, tab);
      d += edgeSeg(bottom, -1, 0, 0, 1, cell, tab);
      d += edgeSeg(left, 0, -1, -1, 0, cell, tab);
      d += " Z";
      list.push({ id: r * N + c, row: r, col: c, path: d });
    }
  }
  return list;
}

// --- Audio (Web Audio API, no external files) ---
let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}
function playClick() {
  const ctx = getCtx();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle";
  const t0 = ctx.currentTime;
  o.frequency.setValueAtTime(900, t0);
  o.frequency.exponentialRampToValueAtTime(420, t0 + 0.09);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.14);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + 0.16);
}
function playWin() {
  const ctx = getCtx();
  if (!ctx) return;
  [523, 659, 784, 1047].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = f;
    const t0 = ctx.currentTime + i * 0.09;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + 0.6);
  });
}

export function JigsawGame({ onExit }: { onExit: () => void }) {
  const [boardSize, setBoardSize] = useState(440);
  const cell = boardSize / N;
  const tab = cell * TAB_RATIO;
  const piece = cell + 2 * tab;

  const [edgesData, setEdgesData] = useState<EdgesData>(() => generateEdges());
  const defs = useMemo(() => buildDefs(edgesData, cell, tab), [edgesData, cell, tab]);

  const areaRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);

  const [boardOrigin, setBoardOrigin] = useState({ x: 0, y: 0 });
  const [states, setStates] = useState<PieceState[]>([]);
  const [ghost, setGhost] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [burst, setBurst] = useState<{ x: number; y: number; key: number } | null>(null);

  const zRef = useRef(1);
  const dragRef = useRef<{ idx: number; sx: number; sy: number; px: number; py: number } | null>(null);
  const startRef = useRef(Date.now());

  // Responsive board sizing
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      let bs: number;
      if (w < 768) {
        // Leave room for header, controls, tray and instructions on mobile
        bs = Math.min(w - 32, Math.floor(h * 0.5), 360);
      } else {
        bs = Math.min(520, Math.floor((w - 80) * 0.5));
      }
      bs = Math.max(N * 30, Math.floor(bs / N) * N);
      setBoardSize(bs);
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
    };
  }, []);

  // Measure board origin relative to area + observe tray for re-scatter
  const trayRectRef = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });
  const [trayVersion, setTrayVersion] = useState(0);
  useEffect(() => {
    const measure = () => {
      const area = areaRef.current;
      const board = boardRef.current;
      const tray = trayRef.current;
      if (!area || !board || !tray) return;
      const ar = area.getBoundingClientRect();
      const br = board.getBoundingClientRect();
      const tr = tray.getBoundingClientRect();
      setBoardOrigin({ x: br.left - ar.left, y: br.top - ar.top });
      const next = { x: tr.left - ar.left, y: tr.top - ar.top, w: tr.width, h: tr.height };
      const prev = trayRectRef.current;
      if (
        Math.abs(prev.x - next.x) > 0.5 ||
        Math.abs(prev.y - next.y) > 0.5 ||
        Math.abs(prev.w - next.w) > 0.5 ||
        Math.abs(prev.h - next.h) > 0.5
      ) {
        trayRectRef.current = next;
        setTrayVersion((v) => v + 1);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (areaRef.current) ro.observe(areaRef.current);
    if (trayRef.current) ro.observe(trayRef.current);
    if (boardRef.current) ro.observe(boardRef.current);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [boardSize]);


  // Scatter pieces into the tray (runs on new game / edges change)
  useEffect(() => {
    const tray = trayRef.current;
    const area = areaRef.current;
    if (!tray || !area) return;
    const ar = area.getBoundingClientRect();
    const tr = tray.getBoundingClientRect();
    const tx = tr.left - ar.left;
    const ty = tr.top - ar.top;
    const w = Math.max(10, tr.width - piece);
    const h = Math.max(10, tr.height - piece);
    const next: PieceState[] = [];
    for (let i = 0; i < N * N; i++) {
      next.push({
        x: tx + Math.random() * w,
        y: ty + 8 + Math.random() * h,
        locked: false,
        z: 0,
      });
    }
    setStates(next);
    startRef.current = Date.now();
    setElapsed(0);
    setShowWin(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edgesData]);

  // Keep locked pieces aligned + re-scatter unlocked pieces when tray/board resizes
  useEffect(() => {
    const tr = trayRectRef.current;
    if (tr.w <= 0 || tr.h <= 0) return;
    const w = Math.max(10, tr.w - piece);
    const h = Math.max(10, tr.h - piece - 8);
    setStates((prev) =>
      prev.map((p, i) => {
        const def = defs[i];
        if (!def) return p;
        if (p.locked) {
          return {
            ...p,
            x: boardOrigin.x + def.col * cell - tab,
            y: boardOrigin.y + def.row * cell - tab,
          };
        }
        // If the piece is currently outside the tray, snap it back inside.
        const inside =
          p.x >= tr.x - 1 &&
          p.y >= tr.y - 1 &&
          p.x <= tr.x + tr.w - piece + 1 &&
          p.y <= tr.y + tr.h - piece + 1;
        if (inside) return p;
        return {
          ...p,
          x: tr.x + Math.random() * w,
          y: tr.y + 8 + Math.random() * h,
        };
      }),
    );
  }, [boardOrigin.x, boardOrigin.y, cell, tab, piece, defs, trayVersion]);


  // Timer
  useEffect(() => {
    if (showWin) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [showWin]);

  // Win detection
  useEffect(() => {
    if (states.length === N * N && states.every((s) => s.locked)) {
      setShowWin(true);
      playWin();
    }
  }, [states]);

  // --- Drag handlers (mouse + touch via pointer events) ---
  const onPointerDown = useCallback(
    (e: React.PointerEvent, idx: number) => {
      const st = states[idx];
      if (!st || st.locked) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      zRef.current += 1;
      dragRef.current = {
        idx,
        sx: e.clientX,
        sy: e.clientY,
        px: st.x,
        py: st.y,
      };
      const z = zRef.current;
      setStates((prev) => prev.map((p, i) => (i === idx ? { ...p, z } : p)));
    },
    [states],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const nx = d.px + (e.clientX - d.sx);
    const ny = d.py + (e.clientY - d.sy);
    setStates((prev) => prev.map((p, i) => (i === d.idx ? { ...p, x: nx, y: ny } : p)));
  }, []);

  const onPointerUp = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    setStates((prev) => {
      const p = prev[d.idx];
      const def = defs[d.idx];
      if (!p || !def || p.locked) return prev;
      const tx = boardOrigin.x + def.col * cell - tab;
      const ty = boardOrigin.y + def.row * cell - tab;
      const dist = Math.hypot(p.x - tx, p.y - ty);
      if (dist < 22) {
        const cx = tx + piece / 2;
        const cy = ty + piece / 2;
        queueMicrotask(() => {
          playClick();
          setBurst({ x: cx, y: cy, key: Date.now() });
        });
        return prev.map((q, i) =>
          i === d.idx ? { ...q, x: tx, y: ty, locked: true } : q,
        );
      }
      return prev;
    });
  }, [boardOrigin.x, boardOrigin.y, cell, tab, piece, defs]);

  const reset = () => setEdgesData(generateEdges());
  const solve = () => {
    setStates(
      defs.map((def) => ({
        x: boardOrigin.x + def.col * cell - tab,
        y: boardOrigin.y + def.row * cell - tab,
        locked: true,
        z: 0,
      })),
    );
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const lockedCount = states.filter((s) => s.locked).length;

  return (
    <div className="min-h-screen px-4 sm:px-8 pb-24">
      <header className="mx-auto max-w-6xl pt-8 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Hub
        </button>
        <div className="min-w-0 text-center">
          <h1 className="font-display text-xl sm:text-3xl font-semibold tracking-tight truncate">
            Orca Jigsaw Puzzle
          </h1>
          <p className="font-mono tabular-nums text-cyan-accent text-sm sm:text-base mt-0.5">
            {mm}:{ss} <span className="text-muted-foreground ml-2 text-xs">{lockedCount}/{N * N}</span>
          </p>
        </div>
        <div className="w-10" />
      </header>

      <div className="mx-auto max-w-6xl mt-5 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setGhost((g) => !g)}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-colors ${
            ghost
              ? "border-cyan-accent/60 bg-cyan-accent/10 text-cyan-accent"
              : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          {ghost ? <Eye className="size-4" /> : <EyeOff className="size-4" />} Ghost Guide
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-3.5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="size-4" /> Reset
        </button>
        <button
          onClick={solve}
          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-3.5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Sparkles className="size-4" /> Solve
        </button>
      </div>

      <div ref={areaRef} className="mx-auto max-w-6xl mt-6 relative" style={{ touchAction: "none" }}>
        <div className="flex flex-col md:flex-row gap-6 items-start justify-center">
          {/* Puzzle board */}
          <div
            ref={boardRef}
            className="relative rounded-2xl border border-cyan-accent/20 shadow-[0_25px_70px_-25px_rgba(80,200,230,0.35)] overflow-hidden"
            style={{
              width: boardSize,
              height: boardSize,
              background:
                "linear-gradient(135deg, #0B132B 0%, #1C2541 100%)",
            }}
          >
            <svg
              className="absolute inset-0 pointer-events-none"
              width={boardSize}
              height={boardSize}
            >
              {Array.from({ length: N + 1 }).map((_, i) => (
                <g key={i}>
                  <line
                    x1={i * cell}
                    y1={0}
                    x2={i * cell}
                    y2={boardSize}
                    stroke="rgba(150,210,235,0.07)"
                  />
                  <line
                    x1={0}
                    y1={i * cell}
                    x2={boardSize}
                    y2={i * cell}
                    stroke="rgba(150,210,235,0.07)"
                  />
                </g>
              ))}
            </svg>
            {ghost && (
              <img
                src={arcticOrcas}
                alt=""
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ opacity: 0.2 }}
              />
            )}
          </div>

          {/* Piece tray */}
          <div
            ref={trayRef}
            className="relative rounded-2xl border border-border/60 bg-[#1C2541]/40 backdrop-blur w-full md:w-[340px] overflow-hidden"
            style={{ height: boardSize }}
          >
            <div className="absolute top-3 left-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 pointer-events-none">
              Piece Tray
            </div>
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-50"
              style={{
                background:
                  "radial-gradient(circle at 30% 20%, rgba(120,200,230,0.08), transparent 60%)",
              }}
            />
          </div>
        </div>

        {/* Pieces — absolutely positioned inside areaRef */}
        {states.map((s, i) => {
          const def = defs[i];
          if (!def) return null;
          const clipId = `jpc-${def.id}`;
          const isDragging = dragRef.current?.idx === i;
          return (
            <div
              key={def.id}
              onPointerDown={(e) => onPointerDown(e, i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="absolute select-none"
              style={{
                left: 0,
                top: 0,
                width: piece,
                height: piece,
                transform: `translate3d(${s.x}px, ${s.y}px, 0)`,
                zIndex: s.locked ? 2 : 20 + s.z,
                cursor: s.locked ? "default" : isDragging ? "grabbing" : "grab",
                filter: s.locked
                  ? "drop-shadow(0 1px 2px rgba(0,0,0,0.45))"
                  : "drop-shadow(0 10px 18px rgba(0,0,0,0.55))",
                pointerEvents: s.locked ? "none" : "auto",
                touchAction: "none",
                transition: isDragging ? "none" : "filter 200ms ease",
              }}
            >
              <svg
                width={piece}
                height={piece}
                viewBox={`0 0 ${piece} ${piece}`}
                style={{ display: "block", overflow: "visible" }}
              >
                <defs>
                  <clipPath id={clipId}>
                    <path d={def.path} />
                  </clipPath>
                </defs>
                <image
                  href={arcticOrcas}
                  x={tab - def.col * cell}
                  y={tab - def.row * cell}
                  width={boardSize}
                  height={boardSize}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${clipId})`}
                />
                <path
                  d={def.path}
                  fill="none"
                  stroke="rgba(255,255,255,0.16)"
                  strokeWidth={1}
                />
              </svg>
            </div>
          );
        })}

        {/* Snap burst */}
        {burst && (
          <div
            key={burst.key}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: burst.x - 36,
              top: burst.y - 36,
              width: 72,
              height: 72,
              background:
                "radial-gradient(circle, rgba(170,235,255,0.85) 0%, rgba(120,200,230,0.4) 35%, transparent 70%)",
              animation: "scale-pop 0.55s ease-out forwards",
              zIndex: 999,
            }}
            onAnimationEnd={() => setBurst(null)}
          />
        )}
      </div>

      {/* Instructions */}
      <div className="mx-auto max-w-6xl mt-8 mb-12">
        <div className="rounded-2xl border border-border/60 bg-[#1C2541]/40 backdrop-blur p-6 md:p-8">
          <h3 className="font-display text-lg font-semibold tracking-tight mb-4">How to Play</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <Eye className="size-4 mt-0.5 text-cyan-accent shrink-0" />
              <span><strong className="text-foreground">Ghost Guide</strong> — Toggle a faint overlay of the complete image on the board to use as a hint while placing pieces.</span>
            </li>
            <li className="flex items-start gap-3">
              <RotateCcw className="size-4 mt-0.5 text-cyan-accent shrink-0" />
              <span><strong className="text-foreground">Reset</strong> — Shuffle all 25 pieces back into the tray and start a fresh puzzle with a new piece cut pattern.</span>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="size-4 mt-0.5 text-cyan-accent shrink-0" />
              <span><strong className="text-foreground">Solve</strong> — Instantly snap every piece into its correct place to see the finished image.</span>
            </li>
          </ul>
        </div>
      </div>

      {showWin && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 backdrop-blur p-4">
          <div
            className="max-w-md w-full rounded-3xl border border-cyan-accent/30 bg-card/95 p-8 text-center animate-pop"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <div className="mx-auto size-16 grid place-items-center rounded-2xl bg-gradient-to-br from-ocean/40 to-cyan-accent/20 mb-4">
              <Trophy className="size-8 text-cyan-accent" />
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              Pod reunited!
            </h2>
            <p className="text-muted-foreground mt-2">
              You pieced the arctic journey together.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-muted/40 px-4 py-1.5 text-sm">
              <CheckCircle2 className="size-4 text-success" />
              <span className="font-mono tabular-nums">
                Final time: {mm}:{ss}
              </span>
            </div>
            <div className="mt-6 flex gap-2 justify-center">
              <button
                onClick={reset}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-ocean-foreground hover:brightness-110 transition"
                style={{ background: "var(--gradient-ocean)" }}
              >
                Play Again
              </button>
              <button
                onClick={onExit}
                className="rounded-xl border border-border/60 bg-muted/30 px-5 py-2.5 text-sm hover:bg-muted/50 transition"
              >
                Back to Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
