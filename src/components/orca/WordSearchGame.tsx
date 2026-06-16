import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Info, RotateCcw, Lock, Trophy, X, Clock, Sparkles, CheckCircle2 } from "lucide-react";
import { Orca } from "./Orca";
import {
  WORDSEARCH_LEVELS,
  TIMED_DIFFICULTIES,
  type WordSearchLevel,
  type WSDirection,
  type TimedDifficulty,
} from "@/lib/wordsearch-data";

const STORAGE_KEY = "orca-wordsearch-progress-v3";
const FIRST_LEVEL_ID = WORDSEARCH_LEVELS[0]?.id ?? 1;
const LAST_LEVEL_ID = WORDSEARCH_LEVELS[WORDSEARCH_LEVELS.length - 1]?.id ?? 1;

type Progress = { unlocked: number; completed: number[] };
type Mode = { kind: "untimed" } | { kind: "timed"; difficulty: TimedDifficulty };

const DIR_VEC: Record<WSDirection, [number, number]> = {
  E: [0, 1], W: [0, -1], S: [1, 0], N: [-1, 0],
  SE: [1, 1], NW: [-1, -1], NE: [-1, 1], SW: [1, -1],
};

function loadProgress(): Progress {
  if (typeof window === "undefined") return { unlocked: FIRST_LEVEL_ID, completed: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: FIRST_LEVEL_ID, completed: [] };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    const validIds = new Set(WORDSEARCH_LEVELS.map((l) => l.id));
    const completed = Array.isArray(parsed.completed)
      ? [...new Set(parsed.completed.filter((id): id is number => Number.isInteger(id) && validIds.has(id)))].sort((a, b) => a - b)
      : [];
    const unlocked = Number.isInteger(parsed.unlocked)
      ? Math.min(Math.max(parsed.unlocked ?? FIRST_LEVEL_ID, FIRST_LEVEL_ID), LAST_LEVEL_ID)
      : FIRST_LEVEL_ID;
    return { unlocked, completed };
  } catch {
    return { unlocked: FIRST_LEVEL_ID, completed: [] };
  }
}

function saveProgress(p: Progress) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

function normalize(word: string) {
  return word.replace(/[^A-Za-z]/g, "").toUpperCase();
}

type Placement = {
  word: string;       // display form
  letters: string;    // normalized
  cells: { r: number; c: number }[];
};

type Layout = {
  grid: string[][];
  placements: Placement[];
};

function buildLayout(level: WordSearchLevel, seed = Date.now()): Layout | null {
  const N = level.gridSize;
  const grid: (string | null)[][] = Array.from({ length: N }, () => Array(N).fill(null));
  const placements: Placement[] = [];

  // simple seeded RNG (mulberry32)
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  const words = [...level.words].sort((a, b) => normalize(b).length - normalize(a).length);

  for (const word of words) {
    const letters = normalize(word);
    let placed = false;
    for (let attempt = 0; attempt < 400 && !placed; attempt++) {
      const dir = pick(level.directions);
      const [dr, dc] = DIR_VEC[dir];
      const len = letters.length;
      const rMin = dr < 0 ? (len - 1) : 0;
      const rMax = dr > 0 ? N - len : N - 1;
      const cMin = dc < 0 ? (len - 1) : 0;
      const cMax = dc > 0 ? N - len : N - 1;
      if (rMin > rMax || cMin > cMax) continue;
      const r0 = rMin + Math.floor(rand() * (rMax - rMin + 1));
      const c0 = cMin + Math.floor(rand() * (cMax - cMin + 1));
      // check fit
      let ok = true;
      for (let i = 0; i < len; i++) {
        const r = r0 + dr * i, c = c0 + dc * i;
        const cur = grid[r][c];
        if (cur !== null && cur !== letters[i]) { ok = false; break; }
      }
      if (!ok) continue;
      const cells: { r: number; c: number }[] = [];
      for (let i = 0; i < len; i++) {
        const r = r0 + dr * i, c = c0 + dc * i;
        grid[r][c] = letters[i];
        cells.push({ r, c });
      }
      placements.push({ word, letters, cells });
      placed = true;
    }
    if (!placed) return null;
  }

  // fill blanks with random letters
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const filled: string[][] = grid.map((row) =>
    row.map((c) => (c === null ? ALPHA[Math.floor(rand() * 26)] : c))
  );
  return { grid: filled, placements };
}

function buildLayoutWithRetries(level: WordSearchLevel): Layout {
  for (let i = 0; i < 30; i++) {
    const out = buildLayout(level, Date.now() + i * 9173 + level.id * 31);
    if (out) return out;
  }
  // fallback minimal grid
  return { grid: Array.from({ length: level.gridSize }, () => Array(level.gridSize).fill("X")), placements: [] };
}

function cellKey(r: number, c: number) { return `${r},${c}`; }

function lineCells(a: { r: number; c: number }, b: { r: number; c: number }) {
  const dr = b.r - a.r, dc = b.c - a.c;
  const adr = Math.abs(dr), adc = Math.abs(dc);
  if (!(dr === 0 || dc === 0 || adr === adc)) return null;
  const len = Math.max(adr, adc) + 1;
  const sr = dr === 0 ? 0 : dr / adr;
  const sc = dc === 0 ? 0 : dc / adc;
  const out: { r: number; c: number }[] = [];
  for (let i = 0; i < len; i++) out.push({ r: a.r + sr * i, c: a.c + sc * i });
  return out;
}

export function WordSearchGame({ onExit }: { onExit: () => void }) {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [mode, setMode] = useState<Mode | null>(null);
  const [levelId, setLevelId] = useState<number>(() => loadProgress().unlocked);
  const [showHelp, setShowHelp] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState<{ start: { r: number; c: number }; current: { r: number; c: number } } | null>(null);
  const [layoutSeed, setLayoutSeed] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const completedLevelRef = useRef<number | null>(null);

  const level = WORDSEARCH_LEVELS.find((l) => l.id === levelId)!;
  const layout = useMemo(() => buildLayoutWithRetries(level), [level, layoutSeed]);

  const remainingWords = level.words.filter((w) => !foundWords.has(w));

  // Reset state per level
  useEffect(() => {
    setFoundWords(new Set());
    setFoundCells(new Set());
    setSelecting(null);
    setShowWin(false);
    setShowTimeUp(false);
    if (mode?.kind === "timed") {
      setTimeLeft(TIMED_DIFFICULTIES[mode.difficulty].seconds);
    } else {
      setTimeLeft(null);
    }
  }, [levelId, layoutSeed, mode]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || showWin || showTimeUp) return;
    if (timeLeft <= 0) {
      setShowTimeUp(true);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => (t === null ? null : t - 1)), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, showWin, showTimeUp]);

  // Win check — guard so it only fires once per level
  const wonRef = useRef<number | null>(null);
  useEffect(() => { wonRef.current = null; }, [levelId, layoutSeed]);
  useEffect(() => {
    if (wonRef.current === level.id) return;
    const completedLevel = level.id;
    if (level.words.length > 0 && level.words.every((word) => foundWords.has(word))) {
      wonRef.current = level.id;
      completedLevelRef.current = completedLevel;
      setTimeLeft(null);
      setShowWin(true);
      setProgress((prev) => {
        const nextUnlocked = Math.min(completedLevel + 1, LAST_LEVEL_ID);
        const next: Progress = {
          unlocked: Math.max(prev.unlocked, nextUnlocked),
          completed: prev.completed.includes(completedLevel) ? prev.completed : [...prev.completed, completedLevel],
        };
        saveProgress(next);
        return next;
      });
    }
  }, [foundWords, level]);

  // ---------- selection / pointer handling ----------
  const gridRef = useRef<HTMLDivElement>(null);

  const cellFromPoint = useCallback((clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!el) return null;
    const cell = el.closest("[data-ws-cell]") as HTMLElement | null;
    if (!cell) return null;
    const r = Number(cell.dataset.row), c = Number(cell.dataset.col);
    if (Number.isNaN(r) || Number.isNaN(c)) return null;
    return { r, c };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const p = cellFromPoint(e.clientX, e.clientY);
    if (!p) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setSelecting({ start: p, current: p });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!selecting) return;
    const p = cellFromPoint(e.clientX, e.clientY);
    if (!p) return;
    if (p.r !== selecting.current.r || p.c !== selecting.current.c) {
      setSelecting({ start: selecting.start, current: p });
    }
  };
  const onPointerUp = () => {
    if (!selecting) return;
    const line = lineCells(selecting.start, selecting.current);
    setSelecting(null);
    if (!line) return;
    const str = line.map((p) => layout.grid[p.r][p.c]).join("");
    const rev = str.split("").reverse().join("");
    const match = remainingWords.find((w) => {
      const n = normalize(w);
      return n === str || n === rev;
    });
    if (!match) return;
    setFoundWords((prev) => new Set(prev).add(match));
    setFoundCells((prev) => {
      const next = new Set(prev);
      line.forEach((p) => next.add(cellKey(p.r, p.c)));
      return next;
    });
  };

  const currentSelectionCells = selecting ? lineCells(selecting.start, selecting.current) : null;
  const selectionSet = new Set((currentSelectionCells ?? []).map((p) => cellKey(p.r, p.c)));

  // ---------- screens ----------
  if (!mode) {
    return <ModeSelect onExit={onExit} onChoose={(m) => setMode(m)} />;
  }

  const N = level.gridSize;
  const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen px-3 sm:px-6 pb-20">
      <header className="mx-auto max-w-6xl pt-6 sm:pt-10 flex items-center gap-3">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Hub
        </button>
        <div className="ml-auto flex items-center gap-2">
          {timeLeft !== null && (
            <div className={[
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-mono border",
              timeLeft <= 30 ? "border-destructive/60 text-destructive bg-destructive/10" : "border-border/60 bg-card/40 text-foreground",
            ].join(" ")}>
              <Clock className="size-3.5" /> {fmt(Math.max(0, timeLeft))}
            </div>
          )}
          <button
            onClick={() => setShowHelp(true)}
            className="inline-flex items-center gap-1.5 text-xs rounded-full border border-border/60 bg-card/40 px-3 py-1.5 hover:border-cyan-accent/50"
          >
            <Info className="size-3.5" /> How to Play
          </button>
          <button
            onClick={() => setLayoutSeed((s) => s + 1)}
            className="inline-flex items-center gap-1.5 text-xs rounded-full border border-border/60 bg-card/40 px-3 py-1.5 hover:border-cyan-accent/50"
            title="Reshuffle"
          >
            <RotateCcw className="size-3.5" /> Reset
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl mt-6 sm:mt-10 text-center animate-slide-up">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-accent/90 mb-2">
          <span className="size-1.5 rounded-full bg-cyan-accent animate-pulse" /> Level {level.id} · {level.difficulty}
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight">
          {level.title}
        </h1>
        <p className="mt-2 text-muted-foreground text-sm max-w-2xl mx-auto">{level.theme}</p>
      </section>

      {/* Level switcher */}
      <div className="mx-auto max-w-6xl mt-6 flex flex-wrap items-center justify-center gap-2">
        {WORDSEARCH_LEVELS.map((l) => {
          const locked = l.id > progress.unlocked;
          const done = progress.completed.includes(l.id);
          const active = l.id === levelId;
          return (
            <button
              key={l.id}
              disabled={locked}
              onClick={() => setLevelId(l.id)}
              className={[
                "inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 border transition-colors",
                active ? "border-cyan-accent/70 bg-cyan-accent/10 text-foreground" : "border-border/60 bg-card/30 text-muted-foreground",
                locked ? "opacity-50 cursor-not-allowed" : "hover:border-cyan-accent/50",
              ].join(" ")}
            >
              {locked ? <Lock className="size-3" /> : done ? <CheckCircle2 className="size-3 text-success" /> : null}
              Lv {l.id}
            </button>
          );
        })}
      </div>

      <section className="mx-auto max-w-6xl mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Grid */}
        <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur p-3 sm:p-5">
          <div
            ref={gridRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="mx-auto select-none"
            style={{
              touchAction: "none",
              width: "min(92vw, 560px)",
              display: "grid",
              gridTemplateColumns: `repeat(${N}, 1fr)`,
              gap: "2px",
            }}
          >
            {layout.grid.map((row, r) =>
              row.map((ch, c) => {
                const k = cellKey(r, c);
                const found = foundCells.has(k);
                const inSel = selectionSet.has(k);
                return (
                  <div
                    key={k}
                    data-ws-cell
                    data-row={r}
                    data-col={c}
                    className={[
                      "aspect-square grid place-items-center rounded-md text-[clamp(0.6rem,2.2vw,1rem)] font-semibold font-mono uppercase transition-colors",
                      found
                        ? "bg-success/30 text-foreground ring-1 ring-success/50"
                        : inSel
                        ? "bg-seafoam/40 text-foreground ring-1 ring-seafoam/70"
                        : "bg-background/40 text-foreground/90 hover:bg-background/60",
                    ].join(" ")}
                  >
                    {ch}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Word list */}
        <aside className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="size-4 text-cyan-accent" /> Find these words
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {foundWords.size}/{level.words.length} found
          </p>
          <ul className="mt-4 grid grid-cols-2 lg:grid-cols-1 gap-1.5 max-h-[50vh] lg:max-h-none overflow-auto pr-1">
            {level.words.map((w) => {
              const done = foundWords.has(w);
              return (
                <li
                  key={w}
                  className={[
                    "text-sm font-mono uppercase tracking-wide rounded-md px-2 py-1 transition-all",
                    done ? "line-through text-muted-foreground/70 bg-success/10" : "text-foreground/90",
                  ].join(" ")}
                >
                  {w.replace(/_/g, " ")}
                </li>
              );
            })}
          </ul>
        </aside>
      </section>

      {/* How to play modal */}
      {showHelp && <HowToPlayModal mode={mode} level={level} onClose={() => setShowHelp(false)} />}

      {/* Win modal */}
      {showWin && (
        <Modal onClose={() => setShowWin(false)}>
          <div className="text-center">
            <Orca size={64} className="mx-auto mb-2" />
            <h3 className="font-display text-2xl font-semibold">Level Complete!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You found all {level.words.length} words in {level.title}.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
              {completedLevelRef.current !== null && completedLevelRef.current < LAST_LEVEL_ID ? (
                <button
                  onClick={() => {
                    const nextLevel = Math.min((completedLevelRef.current ?? level.id) + 1, LAST_LEVEL_ID);
                    setShowWin(false);
                    setLevelId(nextLevel);
                  }}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-ocean-foreground"
                  style={{ background: "var(--gradient-ocean)", boxShadow: "var(--shadow-glow)" }}
                >
                  Next Level →
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 text-success text-sm">
                  <Trophy className="size-4" /> All levels complete!
                </div>
              )}
              <button
                onClick={onExit}
                className="rounded-xl px-5 py-2.5 text-sm font-medium border border-border/60 hover:border-cyan-accent/50"
              >
                Back to Hub
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Time up modal */}
      {showTimeUp && (
        <Modal onClose={() => { /* must restart */ }}>
          <div className="text-center">
            <div className="text-5xl mb-2">⏰</div>
            <h3 className="font-display text-2xl font-semibold">Time's Up!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Don't worry — the pod believes in you. Try {level.title} again.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={() => { setShowTimeUp(false); setLayoutSeed((s) => s + 1); }}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-ocean-foreground"
                style={{ background: "var(--gradient-ocean)", boxShadow: "var(--shadow-glow)" }}
              >
                Try Again
              </button>
              <button
                onClick={() => { setShowTimeUp(false); setMode(null); }}
                className="rounded-xl px-5 py-2.5 text-sm font-medium border border-border/60 hover:border-cyan-accent/50"
              >
                Change Mode
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4 animate-pop">
      <div className="relative w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

function HowToPlayModal({ mode, level, onClose }: { mode: Mode; level: WordSearchLevel; onClose: () => void }) {
  const dirText = level.directions.length <= 2
    ? "horizontally and vertically (forward only)"
    : level.directions.length <= 4
    ? "horizontally, vertically, and diagonally (forward only)"
    : "in all 8 directions, including backwards";

  return (
    <Modal onClose={onClose}>
      <h3 className="font-display text-2xl font-semibold flex items-center gap-2">
        <Info className="size-5 text-cyan-accent" /> How to Play
      </h3>
      <div className="mt-4 space-y-4 text-sm text-foreground/90">
        <div>
          <p className="font-semibold text-foreground">Find the words</p>
          <p className="text-muted-foreground">
            Click (or touch) and drag across letters to highlight a word. You can select {dirText} on this level.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Time Mode</p>
          <p className="text-muted-foreground">
            {mode.kind === "untimed"
              ? "You're in Untimed Mode — relax and take your time."
              : `You're in Timed Mode (${TIMED_DIFFICULTIES[mode.difficulty].label}) — ${TIMED_DIFFICULTIES[mode.difficulty].seconds / 60} minutes per level. The timer resets each new level.`}
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Progress</p>
          <p className="text-muted-foreground">
            Finishing a level unlocks the next one. Your progress is saved automatically in this browser.
          </p>
        </div>
        <div className="rounded-xl border border-cyan-accent/30 bg-cyan-accent/5 p-3">
          <p className="font-semibold text-foreground">Best Experience Recommendation</p>
          <p className="text-muted-foreground">
            While this game is fully responsive, a minimum screen size of 375 px (standard mobile portrait) or greater is highly recommended to comfortably view the larger expert grids.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function ModeSelect({ onExit, onChoose }: { onExit: () => void; onChoose: (m: Mode) => void }) {
  const [timed, setTimed] = useState(false);
  const [diff, setDiff] = useState<TimedDifficulty>("moderate");

  return (
    <div className="min-h-screen px-4 sm:px-8 pb-20">
      <header className="mx-auto max-w-3xl pt-6 sm:pt-10">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Hub
        </button>
      </header>

      <section className="mx-auto max-w-2xl mt-10 sm:mt-16 text-center animate-slide-up">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-accent/90 mb-3">
          <Sparkles className="size-3.5 text-cyan-accent" /> Orca Word Search
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight tracking-tight">
          Choose your <span className="text-gradient-ocean">play mode</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          5 progressive levels of orca-themed word hunting.
        </p>
      </section>

      <section className="mx-auto max-w-2xl mt-10 grid gap-4">
        <button
          onClick={() => onChoose({ kind: "untimed" })}
          className="text-left rounded-3xl border border-border/70 bg-card/60 backdrop-blur p-6 hover:border-cyan-accent/60 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="grid place-items-center size-12 rounded-2xl text-2xl bg-gradient-to-br from-ocean/30 to-cyan-accent/20">🌊</div>
            <div>
              <h3 className="font-display text-xl font-semibold">Untimed Mode</h3>
              <p className="text-sm text-muted-foreground">Relaxed play — no countdown. Just you and the pod.</p>
            </div>
          </div>
        </button>

        <div
          className={[
            "rounded-3xl border bg-card/60 backdrop-blur p-6 transition-all",
            timed ? "border-cyan-accent/60" : "border-border/70 hover:border-cyan-accent/40",
          ].join(" ")}
        >
          <button onClick={() => setTimed((v) => !v)} className="w-full text-left">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center size-12 rounded-2xl text-2xl bg-gradient-to-br from-ocean/30 to-cyan-accent/20">⏱️</div>
              <div>
                <h3 className="font-display text-xl font-semibold">Timed Mode</h3>
                <p className="text-sm text-muted-foreground">Race the clock. Timer resets each level.</p>
              </div>
            </div>
          </button>

          {timed && (
            <div className="mt-5 animate-slide-up">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(TIMED_DIFFICULTIES) as TimedDifficulty[]).map((k) => {
                  const t = TIMED_DIFFICULTIES[k];
                  const active = diff === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setDiff(k)}
                      className={[
                        "rounded-xl border px-3 py-2 text-sm transition-colors",
                        active
                          ? "border-cyan-accent/70 bg-cyan-accent/10"
                          : "border-border/60 bg-background/40 hover:border-cyan-accent/40",
                      ].join(" ")}
                    >
                      <div className="font-semibold">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.seconds / 60} min</div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => onChoose({ kind: "timed", difficulty: diff })}
                className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-ocean-foreground"
                style={{ background: "var(--gradient-ocean)", boxShadow: "var(--shadow-glow)" }}
              >
                Start Timed Game →
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
