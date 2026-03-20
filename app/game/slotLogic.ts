export interface Symbol {
  id: string;
  emoji: string;
  weight: number;
  /** Base payout per symbol in a winning cluster (at bet = 10). */
  clusterValue: number;
}

export interface WinCluster {
  symbolId: string;
  matchCount: number;
  amount: number;
  cells: [number, number][]; // [row, col] pairs
}

export interface WinResult {
  totalWin: number;
  winLines: WinCluster[];
}

export const REEL_COUNT = 6;
export const ROW_COUNT = 5;
export const MIN_CLUSTER = 10; // minimum same symbols for a win

export type ReelResult = Symbol[][];

export const SYMBOLS: Symbol[] = [
  { id: "cherry",  emoji: "🍒", weight: 30, clusterValue: 0.25 },
  { id: "lemon",   emoji: "🍋", weight: 25, clusterValue: 0.3  },
  { id: "orange",  emoji: "🍊", weight: 20, clusterValue: 0.8  },
  { id: "grape",   emoji: "🍇", weight: 15, clusterValue: 2    },
  { id: "star",    emoji: "⭐", weight: 6,  clusterValue: 10   },
  { id: "diamond", emoji: "💎", weight: 3,  clusterValue: 30   },
  { id: "seven",   emoji: "7️⃣", weight: 1,  clusterValue: 80   },
];

const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

export function pickSymbol(): Symbol {
  let rand = Math.random() * totalWeight;
  for (const sym of SYMBOLS) {
    rand -= sym.weight;
    if (rand <= 0) return sym;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

/** Spin all 6 reels, each with 5 rows. Returns grid[reelIndex][rowIndex]. */
export function spin(): ReelResult {
  return Array.from({ length: REEL_COUNT }, () =>
    Array.from({ length: ROW_COUNT }, () => pickSymbol())
  );
}

/** Check for clusters of 10+ identical symbols anywhere on the grid. */
export function checkWins(grid: ReelResult, bet: number): WinResult {
  const counts = new Map<string, { symbol: Symbol; cells: [number, number][] }>();

  for (let col = 0; col < REEL_COUNT; col++) {
    for (let row = 0; row < ROW_COUNT; row++) {
      const sym = grid[col][row];
      if (!counts.has(sym.id)) {
        counts.set(sym.id, { symbol: sym, cells: [] });
      }
      counts.get(sym.id)!.cells.push([row, col]);
    }
  }

  const winLines: WinCluster[] = [];
  let totalWin = 0;

  for (const [, { symbol, cells }] of counts) {
    if (cells.length >= MIN_CLUSTER) {
      const amount = Math.floor(cells.length * symbol.clusterValue * (bet / 10));
      winLines.push({ symbolId: symbol.id, matchCount: cells.length, amount, cells });
      totalWin += amount;
    }
  }

  return { totalWin, winLines };
}

/**
 * Remove winning cells from the grid. Remaining symbols fall down,
 * new random symbols fill from the top. Returns the new grid.
 */
export function cascade(grid: ReelResult, winResult: WinResult): ReelResult {
  const winSet = new Set<string>();
  for (const cluster of winResult.winLines) {
    for (const [row, col] of cluster.cells) {
      winSet.add(`${col},${row}`);
    }
  }

  return grid.map((reel, col) => {
    const survivors = reel.filter((_, row) => !winSet.has(`${col},${row}`));
    const needed = ROW_COUNT - survivors.length;
    const newSymbols = Array.from({ length: needed }, () => pickSymbol());
    // new symbols come from top, survivors stay at bottom in original order
    return [...newSymbols, ...survivors];
  });
}

// Multiplier types (GameClient.tsx'ten taşındı)
export interface MultiplierCell {
  col: number;
  row: number;
  value: number;
}

export const MULTIPLIER_ENTRIES = [
  { value: 2,   weight: 250 },
  { value: 3,   weight: 150 },
  { value: 4,   weight: 80  },
  { value: 5,   weight: 50  },
  { value: 8,   weight: 30  },
  { value: 10,  weight: 20  },
  { value: 12,  weight: 10  },
  { value: 15,  weight: 5   },
  { value: 20,  weight: 3   },
  { value: 25,  weight: 2   },
  { value: 50,  weight: 1   },
  { value: 100, weight: 1   },
] as const;

export const MULTIPLIER_NONE_WEIGHT = 400;

const MULTIPLIER_TOTAL = MULTIPLIER_ENTRIES.reduce((s, e) => s + e.weight, 0) + MULTIPLIER_NONE_WEIGHT;
const CASCADE_MULT_WEIGHT_TOTAL = MULTIPLIER_ENTRIES.reduce((s, e) => s + e.weight, 0);
const CASCADE_MULT_CHANCE = 0.03;

export function pickMultiplier(): number | null {
  let rand = Math.random() * MULTIPLIER_TOTAL;
  if (rand < MULTIPLIER_NONE_WEIGHT) return null;
  rand -= MULTIPLIER_NONE_WEIGHT;
  for (const entry of MULTIPLIER_ENTRIES) {
    rand -= entry.weight;
    if (rand <= 0) return entry.value;
  }
  return MULTIPLIER_ENTRIES[MULTIPLIER_ENTRIES.length - 1].value;
}

function pickCascadeMultiplier(): number | null {
  if (Math.random() > CASCADE_MULT_CHANCE) return null;
  let rand = Math.random() * CASCADE_MULT_WEIGHT_TOTAL;
  for (const entry of MULTIPLIER_ENTRIES) {
    rand -= entry.weight;
    if (rand <= 0) return entry.value;
  }
  return MULTIPLIER_ENTRIES[MULTIPLIER_ENTRIES.length - 1].value;
}

function pickInitialMultiplierCells(): MultiplierCell[] {
  const count = Math.random() < 0.70 ? 1 : Math.random() < 0.75 ? 2 : 3;
  const usedPos = new Set<string>();
  const result: MultiplierCell[] = [];
  for (let i = 0; i < count; i++) {
    const val = pickMultiplier();
    if (val === null) continue;
    let col = 0, row = 0, key = "", attempts = 0;
    do {
      col = Math.floor(Math.random() * REEL_COUNT);
      row = Math.floor(Math.random() * ROW_COUNT);
      key = `${col},${row}`;
      attempts++;
    } while (usedPos.has(key) && attempts < 15);
    usedPos.add(key);
    result.push({ col, row, value: val });
  }
  return result;
}

// Step types for client animation
export interface CascadeWinStep {
  type: 'win';
  winLines: WinCluster[];
}

export interface CascadeFallStep {
  type: 'fall';
  grid: { id: string }[][];
  newCells: string[];
  multiplierCells: MultiplierCell[];
}

export type CascadeStep = CascadeWinStep | CascadeFallStep;

export interface SimulationResult {
  initialGrid: { id: string }[][];
  initialMultiplierCells: MultiplierCell[];
  steps: CascadeStep[];
  totalWin: number;
}

export function simulateSpin(bet: number, isFreeSpin: boolean): SimulationResult {
  const rawGrid = spin();
  const initialMultiplierCells = isFreeSpin ? pickInitialMultiplierCells() : [];

  const steps: CascadeStep[] = [];
  let grid = rawGrid;
  let accumulated = 0;
  let currentMultipliers = [...initialMultiplierCells];

  while (true) {
    const result = checkWins(grid, bet);
    if (result.totalWin === 0) break;

    accumulated += result.totalWin;
    steps.push({ type: 'win', winLines: result.winLines });

    // Count new cells per column
    const removedByCol: Record<number, number> = {};
    result.winLines.forEach(cluster => {
      cluster.cells.forEach(([, col]) => {
        removedByCol[col] = (removedByCol[col] ?? 0) + 1;
      });
    });
    const newCells: string[] = [];
    for (let col = 0; col < REEL_COUNT; col++) {
      const n = removedByCol[col] ?? 0;
      for (let row = 0; row < n; row++) newCells.push(`${col},${row}`);
    }

    // Shift existing multipliers down
    currentMultipliers = currentMultipliers.map(m => {
      let below = 0;
      for (const cluster of result.winLines) {
        for (const [wRow, wCol] of cluster.cells) {
          if (wCol === m.col && wRow > m.row) below++;
        }
      }
      return below > 0 ? { ...m, row: m.row + below } : m;
    });

    // Add cascade multipliers (free spin only)
    if (isFreeSpin) {
      const occupied = new Set(currentMultipliers.map(m => `${m.col},${m.row}`));
      for (const key of newCells) {
        if (!occupied.has(key)) {
          const val = pickCascadeMultiplier();
          if (val !== null) {
            const [c, r] = key.split(',').map(Number);
            currentMultipliers.push({ col: c, row: r, value: val });
            occupied.add(key);
          }
        }
      }
    }

    const newGrid = cascade(grid, result);
    steps.push({
      type: 'fall',
      grid: newGrid.map(col => col.map(s => ({ id: s.id }))),
      newCells,
      multiplierCells: [...currentMultipliers],
    });
    grid = newGrid;
  }

  // Apply multiplier sum
  const multSum = currentMultipliers.reduce((s, m) => s + m.value, 0);
  const totalWin = multSum > 0 && accumulated > 0 ? Math.floor(accumulated * multSum) : accumulated;

  return {
    initialGrid: rawGrid.map(col => col.map(s => ({ id: s.id }))),
    initialMultiplierCells,
    steps,
    totalWin,
  };
}
