import type { CrosswordWord } from "./crossword-data";

export type Direction = "across" | "down";

export type Placement = {
  word: string;
  clue: string;
  row: number;
  col: number;
  dir: Direction;
  number: number;
};

export type LayoutResult = {
  placements: Placement[];
  grid: (string | null)[][];
  rows: number;
  cols: number;
  unplaced: string[];
};

type RawPlacement = Omit<Placement, "number">;

function tryLayout(words: CrosswordWord[], size: number): { placements: RawPlacement[]; grid: (string | null)[][]; unplaced: string[] } | null {
  const grid: (string | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const placements: RawPlacement[] = [];
  const unplaced: string[] = [];

  if (words.length === 0) return { placements, grid, unplaced };

  // Place first word horizontally centered
  const first = words[0];
  const startRow = Math.floor(size / 2);
  const startCol = Math.floor((size - first.word.length) / 2);
  if (startCol < 0) return null;
  for (let i = 0; i < first.word.length; i++) grid[startRow][startCol + i] = first.word[i];
  placements.push({ word: first.word, clue: first.clue, row: startRow, col: startCol, dir: "across" });

  for (let w = 1; w < words.length; w++) {
    const item = words[w];
    const candidates: { row: number; col: number; dir: Direction; score: number }[] = [];

    for (let i = 0; i < item.word.length; i++) {
      const letter = item.word[i];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c] !== letter) continue;
          for (const dir of ["across", "down"] as Direction[]) {
            const row = dir === "across" ? r : r - i;
            const col = dir === "across" ? c - i : c;
            if (row < 0 || col < 0) continue;
            if (dir === "across" && col + item.word.length > size) continue;
            if (dir === "down" && row + item.word.length > size) continue;

            let ok = true;
            let intersections = 0;

            // Cells immediately before/after the word must be empty
            if (dir === "across") {
              if (col > 0 && grid[row][col - 1] !== null) ok = false;
              if (col + item.word.length < size && grid[row][col + item.word.length] !== null) ok = false;
            } else {
              if (row > 0 && grid[row - 1][col] !== null) ok = false;
              if (row + item.word.length < size && grid[row + item.word.length][col] !== null) ok = false;
            }
            if (!ok) continue;

            for (let k = 0; k < item.word.length; k++) {
              const rr = dir === "across" ? row : row + k;
              const cc = dir === "across" ? col + k : col;
              const cell = grid[rr][cc];
              if (cell === null) {
                // Perpendicular neighbors must be empty to avoid accidental adjacency
                if (dir === "across") {
                  if ((rr > 0 && grid[rr - 1][cc] !== null) || (rr < size - 1 && grid[rr + 1][cc] !== null)) {
                    ok = false;
                    break;
                  }
                } else {
                  if ((cc > 0 && grid[rr][cc - 1] !== null) || (cc < size - 1 && grid[rr][cc + 1] !== null)) {
                    ok = false;
                    break;
                  }
                }
              } else if (cell === item.word[k]) {
                intersections++;
              } else {
                ok = false;
                break;
              }
            }

            if (ok && intersections >= 1) {
              const preferredBonus = item.preferred === dir ? 0.5 : 0;
              candidates.push({ row, col, dir, score: intersections + preferredBonus });
            }
          }
        }
      }
    }

    if (candidates.length === 0) {
      unplaced.push(item.word);
      continue;
    }
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    for (let k = 0; k < item.word.length; k++) {
      const rr = best.dir === "across" ? best.row : best.row + k;
      const cc = best.dir === "across" ? best.col + k : best.col;
      grid[rr][cc] = item.word[k];
    }
    placements.push({ word: item.word, clue: item.clue, row: best.row, col: best.col, dir: best.dir });
  }

  return { placements, grid, unplaced };
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildCrossword(words: CrosswordWord[], size: number): LayoutResult {
  // Try many seeds and pick the layout with the most placed words.
  const sorted = [...words].sort((a, b) => b.word.length - a.word.length);

  let best: { placements: RawPlacement[]; grid: (string | null)[][]; unplaced: string[] } | null = null;
  const attempts: CrosswordWord[][] = [sorted];
  // Vary the order of all but the first word
  for (let seed = 1; seed <= 40; seed++) {
    const rest = shuffle(sorted.slice(1), seed);
    attempts.push([sorted[0], ...rest]);
  }

  for (const order of attempts) {
    const result = tryLayout(order, size);
    if (!result) continue;
    if (!best || result.placements.length > best.placements.length) {
      best = result;
      if (result.unplaced.length === 0) break;
    }
  }

  if (!best) {
    return { placements: [], grid: [], rows: 0, cols: 0, unplaced: words.map((w) => w.word) };
  }

  // Number placements in row-major scan order (start cells).
  const startMap = new Map<string, RawPlacement[]>();
  for (const p of best.placements) {
    const key = `${p.row},${p.col}`;
    const arr = startMap.get(key) ?? [];
    arr.push(p);
    startMap.set(key, arr);
  }

  const numbered: Placement[] = [];
  let n = 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const arr = startMap.get(`${r},${c}`);
      if (!arr) continue;
      // Sort so 'across' comes first for stable numbering
      arr.sort((a, b) => (a.dir === b.dir ? 0 : a.dir === "across" ? -1 : 1));
      const number = n++;
      for (const p of arr) numbered.push({ ...p, number });
    }
  }

  return {
    placements: numbered,
    grid: best.grid,
    rows: size,
    cols: size,
    unplaced: best.unplaced,
  };
}
