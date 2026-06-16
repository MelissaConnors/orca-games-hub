import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ArrowLeft, Info, RotateCcw, Eye, CheckCircle2, Lock, Trophy, Sparkles, X } from "lucide-react";
import { CROSSWORD_LEVELS, type CrosswordLevel } from "@/lib/crossword-data";
import { buildCrossword, type Placement, type Direction, type LayoutResult } from "@/lib/crossword-layout";

const STORAGE_KEY = "orca-crossword-progress-v1";

type Progress = {
  unlocked: number; // highest unlocked level id
  completed: number[];
  answers: Record<number, string[][]>; // levelId -> letters grid
};

function loadProgress(): Progress {
  if (typeof window === "undefined") return { unlocked: 1, completed: [], answers: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: 1, completed: [], answers: {} };
    return JSON.parse(raw);
  } catch {
    return { unlocked: 1, completed: [], answers: {} };
  }
}

function saveProgress(p: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function CrosswordGame({ onExit }: { onExit: () => void }) {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [levelId, setLevelId] = useState<number>(() => loadProgress().unlocked);
  const [showHelp, setShowHelp] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [wrongCells, setWrongCells] = useState<Set<string>>(new Set());

  const level = CROSSWORD_LEVELS.find((l) => l.id === levelId)!;

  const layout: LayoutResult = useMemo(() => buildCrossword(level.words, level.gridSize), [level]);

  // Compute used bounding box and remap
  const { trimmedGrid, placements, rows, cols, solutionGrid } = useMemo(() => {
    const sol = layout.grid;
    let minR = sol.length, maxR = -1, minC = sol.length, maxC = -1;
    for (let r = 0; r < sol.length; r++) {
      for (let c = 0; c < sol.length; c++) {
        if (sol[r][c] !== null) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
    }
    if (maxR === -1) {
      return { trimmedGrid: [], placements: [], rows: 0, cols: 0, solutionGrid: [] };
    }
    const newRows = maxR - minR + 1;
    const newCols = maxC - minC + 1;
    const trimmed: (string | null)[][] = Array.from({ length: newRows }, (_, r) =>
      Array.from({ length: newCols }, (_, c) => sol[r + minR][c + minC])
    );
    const remapped = layout.placements.map((p) => ({
      ...p,
      row: p.row - minR,
      col: p.col - minC,
    }));
    return { trimmedGrid: trimmed, placements: remapped, rows: newRows, cols: newCols, solutionGrid: trimmed };
  }, [layout]);

  // User answers grid
  const [answers, setAnswers] = useState<string[][]>(() => {
    const saved = loadProgress().answers[levelId];
    if (saved && saved.length === rows && saved[0]?.length === cols) return saved;
    return Array.from({ length: rows }, () => Array(cols).fill(""));
  });

  // Reset answers when grid shape changes (level switch)
  useEffect(() => {
    const saved = progress.answers[levelId];
    if (saved && saved.length === rows && saved[0]?.length === cols) {
      setAnswers(saved);
    } else {
      setAnswers(Array.from({ length: rows }, () => Array(cols).fill("")));
    }
    setWrongCells(new Set());
    setShowWin(false);
    // pick first placement as active
    if (placements.length > 0) {
      setActive({ row: placements[0].row, col: placements[0].col, dir: placements[0].dir });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId, rows, cols]);

  // Persist answers
  useEffect(() => {
    setProgress((prev) => {
      const next = { ...prev, answers: { ...prev.answers, [levelId]: answers } };
      saveProgress(next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, levelId]);

  // Active cell + direction
  const [active, setActive] = useState<{ row: number; col: number; dir: Direction }>({ row: 0, col: 0, dir: "across" });

  // Build helper maps
  const cellToPlacements = useMemo(() => {
    const map = new Map<string, { across?: Placement; down?: Placement }>();
    for (const p of placements) {
      for (let k = 0; k < p.word.length; k++) {
        const r = p.dir === "across" ? p.row : p.row + k;
        const c = p.dir === "across" ? p.col + k : p.col;
        const key = `${r},${c}`;
        const cur = map.get(key) ?? {};
        cur[p.dir] = p;
        map.set(key, cur);
      }
    }
    return map;
  }, [placements]);

  const isCell = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols && solutionGrid[r]?.[c] !== null && solutionGrid[r]?.[c] !== undefined;

  const numbersAt = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of placements) {
      const key = `${p.row},${p.col}`;
      if (!m.has(key)) m.set(key, p.number);
    }
    return m;
  }, [placements]);

  const acrossClues = useMemo(() => placements.filter((p) => p.dir === "across").sort((a, b) => a.number - b.number), [placements]);
  const downClues = useMemo(() => placements.filter((p) => p.dir === "down").sort((a, b) => a.number - b.number), [placements]);

  const activePlacement = useMemo<Placement | undefined>(() => {
    const entry = cellToPlacements.get(`${active.row},${active.col}`);
    return entry?.[active.dir] ?? entry?.across ?? entry?.down;
  }, [active, cellToPlacements]);

  // Refs for clue list scrolling
  const clueRefs = useRef<Record<string, HTMLLIElement | null>>({});
  useEffect(() => {
    if (!activePlacement) return;
    const key = `${activePlacement.dir}-${activePlacement.number}`;
    const el = clueRefs.current[key];
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activePlacement]);

  // Focus management — hidden input drives mobile virtual keyboard
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  const focusBoard = useCallback(() => {
    // Use preventScroll to avoid page jumping when focusing the off-screen input
    hiddenInputRef.current?.focus({ preventScroll: true });
  }, []);

  const cellIsActiveWord = (r: number, c: number) => {
    if (!activePlacement) return false;
    if (activePlacement.dir === "across") return r === activePlacement.row && c >= activePlacement.col && c < activePlacement.col + activePlacement.word.length;
    return c === activePlacement.col && r >= activePlacement.row && r < activePlacement.row + activePlacement.word.length;
  };

  const handleCellClick = (r: number, c: number) => {
    if (!isCell(r, c)) return;
    setActive((prev) => {
      if (prev.row === r && prev.col === c) {
        // toggle direction if both exist
        const entry = cellToPlacements.get(`${r},${c}`);
        if (entry?.across && entry?.down) {
          return { row: r, col: c, dir: prev.dir === "across" ? "down" : "across" };
        }
      }
      const entry = cellToPlacements.get(`${r},${c}`);
      const dir: Direction = entry?.[prev.dir] ? prev.dir : entry?.across ? "across" : "down";
      return { row: r, col: c, dir };
    });
    focusBoard();
  };

  // Mobile keyboards (Android Gboard etc.) often don't emit reliable keydown
  // for letter keys — handle the synthetic onChange/onBeforeInput instead.
  const handleHiddenInput = (e: React.FormEvent<HTMLInputElement>) => {
    const raw = (e.currentTarget.value || "").replace(/[^a-zA-Z]/g, "");
    e.currentTarget.value = "";
    if (!raw) return;
    const { row, col, dir } = active;
    if (!isCell(row, col)) return;
    let r = row, c = col;
    for (const ch of raw) {
      if (!isCell(r, c)) break;
      setLetter(r, c, ch.toUpperCase());
      const next = advance(r, c, dir, 1);
      r = next.row;
      c = next.col;
    }
    setActive({ row: r, col: c, dir });
  };

  const advance = (r: number, c: number, dir: Direction, step: number): { row: number; col: number } => {
    let nr = r, nc = c;
    if (dir === "across") nc += step;
    else nr += step;
    if (!isCell(nr, nc)) return { row: r, col: c };
    return { row: nr, col: nc };
  };

  const setLetter = (r: number, c: number, letter: string) => {
    setAnswers((prev) => {
      const next = prev.map((row) => row.slice());
      next[r][c] = letter;
      return next;
    });
    setWrongCells((prev) => {
      if (!prev.has(`${r},${c}`)) return prev;
      const n = new Set(prev);
      n.delete(`${r},${c}`);
      return n;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const { row, col, dir } = active;
    if (!isCell(row, col)) return;
    if (e.key === "ArrowUp") { e.preventDefault(); moveTo(row - 1, col, "down"); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); moveTo(row + 1, col, "down"); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); moveTo(row, col - 1, "across"); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); moveTo(row, col + 1, "across"); return; }
    if (e.key === "Backspace") {
      e.preventDefault();
      if (answers[row][col]) {
        setLetter(row, col, "");
      } else {
        const back = advance(row, col, dir, -1);
        setLetter(back.row, back.col, "");
        setActive({ ...back, dir });
      }
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const list = dir === "across" ? acrossClues : downClues;
      if (!activePlacement || list.length === 0) return;
      const idx = list.findIndex((p) => p.number === activePlacement.number && p.dir === activePlacement.dir);
      const next = list[(idx + (e.shiftKey ? -1 : 1) + list.length) % list.length];
      setActive({ row: next.row, col: next.col, dir: next.dir });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const list = dir === "across" ? acrossClues : downClues;
      if (!activePlacement || list.length === 0) return;
      const idx = list.findIndex((p) => p.number === activePlacement.number && p.dir === activePlacement.dir);
      const next = list[(idx + 1) % list.length];
      setActive({ row: next.row, col: next.col, dir: next.dir });
      return;
    }
    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      const letter = e.key.toUpperCase();
      setLetter(row, col, letter);
      const next = advance(row, col, dir, 1);
      setActive({ ...next, dir });
    }
  };

  const moveTo = (r: number, c: number, preferredDir: Direction) => {
    // step in direction until a cell is found, up to grid size
    let nr = r, nc = c;
    let safety = Math.max(rows, cols);
    while (safety-- > 0 && !isCell(nr, nc)) {
      if (preferredDir === "across") nc += nc < active.col ? -1 : 1;
      else nr += nr < active.row ? -1 : 1;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) return;
    }
    if (isCell(nr, nc)) {
      const entry = cellToPlacements.get(`${nr},${nc}`);
      const dir: Direction = entry?.[preferredDir] ? preferredDir : entry?.across ? "across" : "down";
      setActive({ row: nr, col: nc, dir });
    }
  };

  // Win detection
  useEffect(() => {
    if (rows === 0) return;
    let complete = true;
    for (let r = 0; r < rows && complete; r++) {
      for (let c = 0; c < cols; c++) {
        const sol = solutionGrid[r][c];
        if (sol === null) continue;
        if (answers[r]?.[c] !== sol) { complete = false; break; }
      }
    }
    if (complete && !progress.completed.includes(levelId)) {
      setShowWin(true);
      setProgress((prev) => {
        const next: Progress = {
          ...prev,
          completed: prev.completed.includes(levelId) ? prev.completed : [...prev.completed, levelId],
          unlocked: Math.max(prev.unlocked, Math.min(levelId + 1, CROSSWORD_LEVELS.length)),
        };
        saveProgress(next);
        return next;
      });
    }
  }, [answers, rows, cols, solutionGrid, levelId, progress.completed]);

  const handleCheck = () => {
    const wrong = new Set<string>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sol = solutionGrid[r][c];
        if (sol === null) continue;
        const v = answers[r]?.[c];
        if (v && v !== sol) wrong.add(`${r},${c}`);
      }
    }
    setWrongCells(wrong);
    setTimeout(() => setWrongCells(new Set()), 2500);
  };

  const handleRevealLetter = () => {
    const { row, col } = active;
    if (!isCell(row, col)) return;
    setLetter(row, col, solutionGrid[row][col] as string);
  };

  const handleReset = () => {
    setAnswers(Array.from({ length: rows }, () => Array(cols).fill("")));
    setWrongCells(new Set());
  };

  const handleAdvance = () => {
    const nextId = Math.min(levelId + 1, CROSSWORD_LEVELS.length);
    setShowWin(false);
    setLevelId(nextId);
  };

  // Compute cell size for nice fit
  const cellSizeClass = cols > 18 ? "w-7 h-7 text-[11px] sm:w-8 sm:h-8 sm:text-xs" : cols > 14 ? "w-8 h-8 text-xs sm:w-9 sm:h-9 sm:text-sm" : "w-9 h-9 text-sm sm:w-10 sm:h-10 sm:text-base";

  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(160deg,#0B192C 0%,#0a1626 60%,#0B192C 100%)" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[#0B192C]/80 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center gap-3">
          <button onClick={onExit} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 transition">
            <ArrowLeft className="size-4" /> Hub
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base sm:text-xl font-semibold truncate">OrcaQuest: The Ultimate Crossword Challenge</h1>
            <p className="text-[11px] sm:text-xs text-white/50 truncate">Level {level.id} · {level.title} · <span className="text-[#4E9F3D]">{level.difficulty}</span></p>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium bg-white/10 hover:bg-white/15 border border-white/10 transition"
          >
            <Info className="size-4" /> <span className="hidden sm:inline">How to Play</span>
          </button>
        </div>

        {/* Level Selector */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto">
          {CROSSWORD_LEVELS.map((l) => {
            const unlocked = l.id <= progress.unlocked;
            const completed = progress.completed.includes(l.id);
            const active = l.id === levelId;
            return (
              <button
                key={l.id}
                disabled={!unlocked}
                onClick={() => unlocked && setLevelId(l.id)}
                className={[
                  "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition",
                  active
                    ? "bg-[#4E9F3D] text-white border-[#4E9F3D] shadow-[0_0_20px_rgba(78,159,61,0.4)]"
                    : unlocked
                      ? "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"
                      : "bg-white/[0.02] text-white/30 border-white/5 cursor-not-allowed",
                ].join(" ")}
              >
                {!unlocked ? <Lock className="size-3" /> : completed ? <CheckCircle2 className="size-3 text-[#4E9F3D]" /> : <span className="size-1.5 rounded-full bg-current opacity-60" />}
                Level {l.id}
              </button>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Board */}
        <section className="flex flex-col items-center">
          <div
            ref={boardRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="inline-block rounded-2xl border border-white/10 bg-[#06111f] p-3 sm:p-4 shadow-2xl outline-none focus:ring-2 focus:ring-[#4E9F3D]/40"
          >
            <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
              {Array.from({ length: rows }).map((_, r) =>
                Array.from({ length: cols }).map((_, c) => {
                  const sol = solutionGrid[r]?.[c];
                  const filled = sol !== null && sol !== undefined;
                  if (!filled) {
                    return <div key={`${r}-${c}`} className={`${cellSizeClass} bg-transparent`} />;
                  }
                  const val = answers[r]?.[c] ?? "";
                  const isActive = active.row === r && active.col === c;
                  const inWord = cellIsActiveWord(r, c);
                  const wrong = wrongCells.has(`${r},${c}`);
                  const num = numbersAt.get(`${r},${c}`);
                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => handleCellClick(r, c)}
                      className={[
                        cellSizeClass,
                        "relative border border-[#0B192C] flex items-center justify-center font-semibold cursor-pointer select-none transition-colors",
                        isActive
                          ? "bg-[#4E9F3D] text-white"
                          : inWord
                            ? "bg-[#1E5128]/70 text-white"
                            : "bg-white text-[#0B192C] hover:bg-white/90",
                        wrong ? "!bg-red-500 text-white animate-pulse" : "",
                      ].join(" ")}
                    >
                      {num !== undefined && (
                        <span className={`absolute top-0 left-0.5 text-[8px] sm:text-[9px] leading-none font-bold ${isActive || inWord ? "text-white/90" : "text-[#0B192C]/60"}`}>
                          {num}
                        </span>
                      )}
                      <span>{val}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer controls */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <button onClick={handleReset} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 transition">
              <RotateCcw className="size-4" /> Reset Level
            </button>
            <button onClick={handleRevealLetter} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 transition">
              <Eye className="size-4" /> Reveal Letter
            </button>
            <button onClick={handleCheck} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm bg-[#4E9F3D] hover:brightness-110 text-white font-medium transition">
              <CheckCircle2 className="size-4" /> Check Grid
            </button>
          </div>

          {layout.unplaced.length > 0 && (
            <p className="mt-3 text-[11px] text-white/40 max-w-md text-center">
              Note: {layout.unplaced.length} word(s) could not be auto-fit into this grid and were omitted from this layout.
            </p>
          )}
        </section>

        {/* Clue lists */}
        <section className="grid sm:grid-cols-2 gap-4 lg:max-h-[calc(100vh-220px)]">
          <ClueList
            title="Across"
            clues={acrossClues}
            activePlacement={activePlacement}
            onSelect={(p) => setActive({ row: p.row, col: p.col, dir: p.dir })}
            clueRefs={clueRefs}
          />
          <ClueList
            title="Down"
            clues={downClues}
            activePlacement={activePlacement}
            onSelect={(p) => setActive({ row: p.row, col: p.col, dir: p.dir })}
            clueRefs={clueRefs}
          />
        </section>
      </main>

      {showHelp && <HowToPlayModal onClose={() => setShowHelp(false)} />}
      {showWin && <WinModal level={level} isLast={levelId === CROSSWORD_LEVELS.length} onAdvance={handleAdvance} onClose={() => setShowWin(false)} />}
    </div>
  );
}

function ClueList({
  title,
  clues,
  activePlacement,
  onSelect,
  clueRefs,
}: {
  title: string;
  clues: Placement[];
  activePlacement?: Placement;
  onSelect: (p: Placement) => void;
  clueRefs: React.MutableRefObject<Record<string, HTMLLIElement | null>>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur p-4 overflow-hidden flex flex-col min-h-0">
      <h2 className="font-display text-sm uppercase tracking-[0.2em] text-[#4E9F3D] mb-3">{title}</h2>
      <ul className="space-y-1 overflow-y-auto pr-1 text-sm">
        {clues.map((p) => {
          const isActive = activePlacement?.number === p.number && activePlacement?.dir === p.dir;
          const key = `${p.dir}-${p.number}`;
          return (
            <li
              key={key}
              ref={(el) => { clueRefs.current[key] = el; }}
              onClick={() => onSelect(p)}
              className={[
                "rounded-lg px-3 py-2 cursor-pointer transition border border-transparent",
                isActive ? "bg-[#1E5128]/60 border-[#4E9F3D]/40 text-white" : "text-white/75 hover:bg-white/5",
              ].join(" ")}
            >
              <span className="font-semibold text-[#4E9F3D] mr-2">{p.number}.</span>
              {p.clue}
            </li>
          );
        })}
        {clues.length === 0 && <li className="text-white/40 text-xs italic">No clues in this direction.</li>}
      </ul>
    </div>
  );
}

function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-w-lg w-full rounded-2xl bg-[#0B192C] border border-white/10 shadow-2xl p-6 sm:p-8 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-white/50 hover:text-white"><X className="size-5" /></button>
        <div className="flex items-center gap-2 text-[#4E9F3D] mb-1">
          <Info className="size-4" />
          <span className="text-xs uppercase tracking-[0.2em] font-semibold">How to Play</span>
        </div>
        <h2 className="font-display text-2xl font-semibold mb-4">OrcaQuest Crossword</h2>

        <div className="space-y-4 text-sm text-white/80">
          <div>
            <h3 className="font-semibold text-white mb-1">Objective</h3>
            <p>Complete all 15 words in the current level to unlock the next, increasingly difficult Orca-themed crossword puzzle.</p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Mouse</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Click a cell once to select it and highlight the word.</li>
              <li>Click the same cell again to switch direction between <span className="text-[#4E9F3D] font-medium">Across</span> and <span className="text-[#4E9F3D] font-medium">Down</span>.</li>
              <li>Click any clue in the sidebar to jump to its matching cells.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Keyboard</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">A–Z</kbd> Type letters (auto-capitalized).</li>
              <li><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">Backspace</kbd> Erase and step backward.</li>
              <li><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">↑ ↓ ← →</kbd> Move the cursor manually.</li>
              <li><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">Enter</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">Tab</kbd> Jump to the next clue.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Footer Tools</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium">Reset Level</span> — clear all entries on this puzzle.</li>
              <li><span className="font-medium">Reveal Letter</span> — fill the active cell with the correct letter.</li>
              <li><span className="font-medium">Check Grid</span> — incorrect letters flash red briefly.</li>
            </ul>
          </div>
        </div>

        <button onClick={onClose} className="mt-6 w-full rounded-lg bg-[#4E9F3D] hover:brightness-110 text-white font-semibold py-2.5 transition">
          Dive In
        </button>
      </div>
    </div>
  );
}

function WinModal({ level, isLast, onAdvance, onClose }: { level: CrosswordLevel; isLast: boolean; onAdvance: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="max-w-md w-full rounded-2xl bg-gradient-to-br from-[#0B192C] to-[#1E5128] border border-[#4E9F3D]/40 shadow-[0_0_60px_rgba(78,159,61,0.4)] p-8 text-center relative animate-slide-up">
        <button onClick={onClose} className="absolute top-3 right-3 text-white/50 hover:text-white"><X className="size-5" /></button>
        <div className="mx-auto size-16 rounded-full bg-[#4E9F3D] grid place-items-center mb-4 animate-float">
          <Trophy className="size-8 text-white" />
        </div>
        <p className="text-xs uppercase tracking-[0.25em] text-[#4E9F3D] font-semibold flex items-center justify-center gap-1.5">
          <Sparkles className="size-3" /> Level Completed
        </p>
        <h2 className="font-display text-3xl font-semibold mt-2">🫍 You did it!</h2>
        <p className="text-white/80 mt-3">
          You conquered <span className="font-semibold text-white">Level {level.id}: {level.title}</span>. The pod has welcomed your wisdom.
        </p>
        {isLast ? (
          <button onClick={onClose} className="mt-6 w-full rounded-lg bg-[#4E9F3D] hover:brightness-110 text-white font-semibold py-3 transition">
            Celebrate 🎉
          </button>
        ) : (
          <button onClick={onAdvance} className="mt-6 w-full rounded-lg bg-[#4E9F3D] hover:brightness-110 text-white font-semibold py-3 transition">
            Unlock & Advance to Level {level.id + 1} →
          </button>
        )}
      </div>
    </div>
  );
}
