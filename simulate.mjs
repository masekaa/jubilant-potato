/**
 * Slot RTP Simulator — Base game + Free Spin
 * Usage: node simulate.mjs [spins]
 */

const REEL_COUNT = 6;
const ROW_COUNT  = 5;
const SPINS      = parseInt(process.argv[2] ?? "500000");
const BET        = 10;

// ─── Slot parameters (must match slotLogic.ts) ────────────────────────────────

const MIN_CLUSTER = 10;

const SYMBOLS = [
  { id: "cherry",  weight: 30, clusterValue: 0.25 },
  { id: "lemon",   weight: 25, clusterValue: 0.3  },
  { id: "orange",  weight: 20, clusterValue: 0.8  },
  { id: "grape",   weight: 15, clusterValue: 2    },
  { id: "star",    weight: 6,  clusterValue: 10   },
  { id: "diamond", weight: 3,  clusterValue: 30   },
  { id: "seven",   weight: 1,  clusterValue: 80   },
];

// ─── Free spin parameters (must match GameClient.tsx) ─────────────────────────

const FREE_SPIN_COUNT    = 10;
const FREE_SPIN_COST_MULT = 8;  // cost = bet × 8

const MULTIPLIER_ENTRIES = [
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
];
const MULTIPLIER_NONE_WEIGHT = 400;
const MULTIPLIER_TOTAL = MULTIPLIER_ENTRIES.reduce((s, e) => s + e.weight, 0) + MULTIPLIER_NONE_WEIGHT;

// ─── Engine ───────────────────────────────────────────────────────────────────

const TOTAL_SYM_WEIGHT = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);

function pickSymbol() {
  let rand = Math.random() * TOTAL_SYM_WEIGHT;
  for (const sym of SYMBOLS) { rand -= sym.weight; if (rand <= 0) return sym; }
  return SYMBOLS[SYMBOLS.length - 1];
}

function pickMultiplier() {
  let rand = Math.random() * MULTIPLIER_TOTAL;
  if (rand < MULTIPLIER_NONE_WEIGHT) return null;
  rand -= MULTIPLIER_NONE_WEIGHT;
  for (const e of MULTIPLIER_ENTRIES) { rand -= e.weight; if (rand <= 0) return e.value; }
  return MULTIPLIER_ENTRIES[MULTIPLIER_ENTRIES.length - 1].value;
}

function checkWins(grid) {
  const counts = new Map();
  for (let col = 0; col < REEL_COUNT; col++)
    for (let row = 0; row < ROW_COUNT; row++) {
      const sym = grid[col][row];
      if (!counts.has(sym.id)) counts.set(sym.id, { symbol: sym, cells: [] });
      counts.get(sym.id).cells.push([row, col]);
    }
  let totalWin = 0;
  const winLines = [];
  for (const [, { symbol, cells }] of counts)
    if (cells.length >= MIN_CLUSTER) {
      const amount = Math.floor(cells.length * symbol.clusterValue * (BET / 10));
      winLines.push({ symbolId: symbol.id, matchCount: cells.length, amount, cells });
      totalWin += amount;
    }
  return { totalWin, winLines };
}

function cascade(grid, winResult) {
  const winSet = new Set();
  for (const cl of winResult.winLines)
    for (const [row, col] of cl.cells) winSet.add(`${col},${row}`);
  return grid.map((reel, col) => {
    const survivors = reel.filter((_, row) => !winSet.has(`${col},${row}`));
    const needed = ROW_COUNT - survivors.length;
    return [...Array.from({ length: needed }, () => pickSymbol()), ...survivors];
  });
}

/** Simulate one full spin (primary + all cascades). Returns total payout. */
function simulateSpin() {
  let grid = Array.from({ length: REEL_COUNT }, () =>
    Array.from({ length: ROW_COUNT }, () => pickSymbol())
  );
  let payout = 0;
  while (true) {
    const result = checkWins(grid);
    if (result.totalWin === 0) break;
    payout += result.totalWin;
    grid = cascade(grid, result);
  }
  return payout;
}

/** Simulate one free spin with multipliers. Returns final payout after multiplier. */
function simulateFreeSpin() {
  // Spawn multiplier cells (1-3 slots, each may be null)
  const slotCount = Math.random() < 0.70 ? 1 : Math.random() < 0.75 ? 2 : 3;
  const multValues = [];
  for (let i = 0; i < slotCount; i++) {
    const val = pickMultiplier();
    if (val !== null) multValues.push(val);
  }

  const accumulated = simulateSpin();

  const multSum = multValues.reduce((s, v) => s + v, 0);
  return (multSum > 0 && accumulated > 0)
    ? Math.floor(accumulated * multSum)
    : accumulated;
}

// ─── BASE GAME simulation ─────────────────────────────────────────────────────

let baseTotalBet = 0, baseTotalPayout = 0, baseWins = 0;
for (let i = 0; i < SPINS; i++) {
  baseTotalBet += BET;
  const payout = simulateSpin();
  baseTotalPayout += payout;
  if (payout > 0) baseWins++;
}
const baseRTP    = (baseTotalPayout / baseTotalBet * 100).toFixed(2);
const baseWinPct = (baseWins / SPINS * 100).toFixed(1);
const baseAvgWin = (baseTotalPayout / SPINS).toFixed(2);

// ─── FREE SPIN simulation ─────────────────────────────────────────────────────

const FS_SESSIONS = Math.floor(SPINS / FREE_SPIN_COUNT); // one "purchase" = 10 spins
const fsCost = BET * FREE_SPIN_COST_MULT; // 80 coins

let fsTotalCost = 0, fsTotalReturn = 0;
let fsMultiplierSum = 0, fsMultiplierCount = 0;

for (let s = 0; s < FS_SESSIONS; s++) {
  fsTotalCost += fsCost;
  let sessionReturn = 0;
  for (let i = 0; i < FREE_SPIN_COUNT; i++) {
    const payout = simulateFreeSpin();
    sessionReturn += payout;
    // track multiplier stats
    const slotCount = Math.random() < 0.70 ? 1 : Math.random() < 0.75 ? 2 : 3;
    let sum = 0;
    for (let j = 0; j < slotCount; j++) { const v = pickMultiplier(); if (v) sum += v; }
    if (sum > 0) { fsMultiplierSum += sum; fsMultiplierCount++; }
  }
  fsTotalReturn += sessionReturn;
}

const fsRTP        = (fsTotalReturn / fsTotalCost * 100).toFixed(2);
const fsAvgReturn  = (fsTotalReturn / FS_SESSIONS).toFixed(1);
const fsAvgMultWhenActive = fsMultiplierCount > 0 ? (fsMultiplierSum / fsMultiplierCount).toFixed(2) : "0";

// ─── Print results ────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(56)}`);
console.log(` Slot RTP Simulator — ${SPINS.toLocaleString()} spins`);
console.log(`${"═".repeat(56)}`);
console.log(` MIN_CLUSTER = ${MIN_CLUSTER}   BET = ${BET}`);
console.log(`${"─".repeat(56)}`);

console.log(`\n BASE GAME`);
console.log(`   RTP:         ${baseRTP}%`);
console.log(`   Win rate:    ${baseWinPct}% of spins`);
console.log(`   Avg payout:  ${baseAvgWin} coins/spin`);

console.log(`\n FREE SPIN PURCHASE  (maliyet: ${fsCost} coin / ${FREE_SPIN_COUNT} spin)`);
console.log(`   RTP:         ${fsRTP}%`);
console.log(`   Avg return:  ${fsAvgReturn} coins per purchase`);
console.log(`   Avg multiplier (aktif olduğunda): ${fsAvgMultWhenActive}×`);

// Break-even cost for free spins
const breakEvenCost = (fsTotalReturn / FS_SESSIONS).toFixed(1);
console.log(`\n Break-even: ${FREE_SPIN_COUNT} free spin  ${breakEvenCost} coin değerinde`);
console.log(` Mevcut maliyet: ${fsCost} coin`);
const overunder = ((fsTotalReturn / fsTotalCost - 1) * 100).toFixed(1);
console.log(` Oyuncuya avantaj: ${overunder > 0 ? "+" : ""}${overunder}%`);

// Recommend cost for ~100% RTP
const fairCost = Math.round(fsTotalReturn / FS_SESSIONS);
console.log(`\n Break-even maliyet olması için: bet × ${(fairCost / BET).toFixed(1)}`);
console.log(`${"─".repeat(56)}`);

console.log(`\n COMBINED RTP (baz oyun kazancına göre ne kadar ilave?)`);
// If player buys free spins every N spins of base game:
// Every spin: pay BET, win avg baseAvgWin. Also buy freespins occasionally.
// Assume player buys free spins every 100 base spins as a reference.
const refSpins = 100;
const baseCostRef = refSpins * BET;
const basePayRef  = refSpins * parseFloat(baseAvgWin);
const fsCostRef   = fsCost;
const fsPayRef    = parseFloat(fsAvgReturn);
const combinedRTP = ((basePayRef + fsPayRef) / (baseCostRef + fsCostRef) * 100).toFixed(2);
console.log(`   (${refSpins} baz spin + 1 free spin satın alımı senaryosu)`);
console.log(`   Combined RTP: ${combinedRTP}%`);
console.log(`${"═".repeat(56)}\n`);
