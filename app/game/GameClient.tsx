"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  SYMBOLS,
  REEL_COUNT,
  ROW_COUNT,
  MIN_CLUSTER,
  type Symbol,
  type WinResult,
  type MultiplierCell,
  type CascadeStep,
  type SimulationResult,
} from "./slotLogic";

const BET_OPTIONS = [10, 25, 50, 100] as const;
type BetOption = (typeof BET_OPTIONS)[number];

const STARTING_BALANCE = 1000;
const SLOT_H = 76; // px per cell — reduced so 5 rows fit comfortably
const STRIP_EXTRA = 15; // used by ReelComponent (kept but not rendered during spin)
// Spin fall animation timing (column-sequential waterfall)
const SPIN_ROW_STAGGER = 38;  // ms between each row within a column
const SPIN_FALL_MS     = 230; // ms for each symbol to fall into place
const SPIN_COL_DELAY   = (ROW_COUNT - 1) * SPIN_ROW_STAGGER + SPIN_FALL_MS; // col N+1 starts when col N finishes
const SPIN_TOTAL_MS    = REEL_COUNT * SPIN_COL_DELAY; // last symbol lands
const FREE_SPIN_COUNT = 10;
const FREE_SPIN_COST_MULT = 100; // cost = bet × 100

// ─── SVG Symbol Icons ──────────────────────────────────────────────────────────

function CherryIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id="ch1" cx="35%" cy="25%" r="65%">
          <stop offset="0%" stopColor="#ff7b7b" />
          <stop offset="100%" stopColor="#b91c1c" />
        </radialGradient>
        <radialGradient id="ch2" cx="35%" cy="25%" r="65%">
          <stop offset="0%" stopColor="#ff7b7b" />
          <stop offset="100%" stopColor="#b91c1c" />
        </radialGradient>
      </defs>
      {/* stem */}
      <path d="M22 42 Q23 27 32 20 Q41 27 42 42" stroke="#166534" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* leaf */}
      <ellipse cx="32" cy="19" rx="6.5" ry="3.5" fill="#16a34a" transform="rotate(-18 32 19)" />
      {/* cherries */}
      <circle cx="17" cy="51" r="13" fill="url(#ch1)" />
      <circle cx="47" cy="51" r="13" fill="url(#ch2)" />
      {/* shine */}
      <ellipse cx="13" cy="45" rx="4" ry="2.5" fill="rgba(255,255,255,0.45)" transform="rotate(-30 13 45)" />
      <ellipse cx="43" cy="45" rx="4" ry="2.5" fill="rgba(255,255,255,0.45)" transform="rotate(-30 43 45)" />
    </svg>
  );
}

function LemonIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id="lem" cx="38%" cy="28%" r="65%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#ca8a04" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="33" rx="23" ry="19" fill="url(#lem)" />
      <ellipse cx="9" cy="33" rx="6" ry="4" fill="#a16207" transform="rotate(-12 9 33)" />
      <ellipse cx="55" cy="33" rx="6" ry="4" fill="#a16207" transform="rotate(12 55 33)" />
      <path d="M17 33 Q32 28 47 33" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" fill="none" />
      <path d="M20 27 Q32 23 44 27" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" fill="none" />
      <ellipse cx="25" cy="23" rx="5.5" ry="3" fill="rgba(255,255,255,0.45)" transform="rotate(-22 25 23)" />
    </svg>
  );
}

function OrangeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id="org" cx="38%" cy="28%" r="65%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#c2410c" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="35" r="22" fill="url(#org)" />
      <path d="M32 13 L32 9" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="35" cy="12" rx="5" ry="8" fill="#16a34a" transform="rotate(18 35 12)" />
      {/* texture lines */}
      <path d="M32 13 L32 57" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
      <path d="M10 35 L54 35" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
      <path d="M14 22 L50 48" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <path d="M50 22 L14 48" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <ellipse cx="23" cy="23" rx="6.5" ry="4" fill="rgba(255,255,255,0.38)" transform="rotate(-22 23 23)" />
    </svg>
  );
}

function GrapeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id="grp" cx="35%" cy="25%" r="65%">
          <stop offset="0%" stopColor="#e879f9" />
          <stop offset="100%" stopColor="#6b21a8" />
        </radialGradient>
      </defs>
      <path d="M32 8 L32 15" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 10 Q41 5 44 11 Q37 14 32 10Z" fill="#16a34a" />
      {/* row 1 */}
      <circle cx="26" cy="22" r="8.5" fill="url(#grp)" />
      <circle cx="38" cy="22" r="8.5" fill="url(#grp)" />
      {/* row 2 */}
      <circle cx="19" cy="33" r="8.5" fill="url(#grp)" />
      <circle cx="32" cy="33" r="8.5" fill="url(#grp)" />
      <circle cx="45" cy="33" r="8.5" fill="url(#grp)" />
      {/* row 3 */}
      <circle cx="26" cy="44" r="8.5" fill="url(#grp)" />
      <circle cx="38" cy="44" r="8.5" fill="url(#grp)" />
      {/* shines */}
      {([[22,17],[34,17],[15,29],[28,29],[41,29],[22,40],[34,40]] as [number,number][]).map(([cx, cy], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx="2.5" ry="1.8" fill="rgba(255,255,255,0.42)" transform={`rotate(-30 ${cx} ${cy})`} />
      ))}
    </svg>
  );
}

function StarIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id="str" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="55%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <filter id="strGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* outer glow */}
      <polygon
        points="32,4 38.2,22 57,22 42.4,33 48.6,51 32,39.5 15.4,51 21.6,33 7,22 25.8,22"
        fill="#fbbf24" opacity="0.25" filter="url(#strGlow)"
      />
      <polygon
        points="32,4 38.2,22 57,22 42.4,33 48.6,51 32,39.5 15.4,51 21.6,33 7,22 25.8,22"
        fill="url(#str)" stroke="#f59e0b" strokeWidth="0.8"
      />
      <ellipse cx="26" cy="17" rx="5" ry="3" fill="rgba(255,255,255,0.5)" transform="rotate(-28 26 17)" />
    </svg>
  );
}

function DiamondIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="dia1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="dia2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>
        <filter id="diaGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* glow */}
      <polygon points="32,5 53,24 32,61 11,24" fill="#38bdf8" opacity="0.2" filter="url(#diaGlow)" />
      {/* facets */}
      <polygon points="32,5 53,24 32,17 11,24" fill="url(#dia1)" />
      <polygon points="11,24 32,17 32,61" fill="#0369a1" />
      <polygon points="53,24 32,17 32,61" fill="url(#dia2)" />
      <polygon points="32,5 53,24 32,61 11,24" fill="none" stroke="#0891b2" strokeWidth="1" />
      {/* top shine */}
      <polygon points="32,5 42,24 32,17 22,24" fill="rgba(255,255,255,0.4)" />
      <circle cx="38" cy="12" r="3" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}

function SevenIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id="svn" cx="38%" cy="28%" r="65%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="100%" stopColor="#991b1b" />
        </radialGradient>
        <filter id="svnGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx="32" cy="32" r="29" fill="url(#svn)" />
      <circle cx="32" cy="32" r="29" fill="none" stroke="#fca5a5" strokeWidth="1.5" />
      <text
        x="33" y="47"
        textAnchor="middle"
        fontSize="38"
        fontWeight="900"
        fontFamily="'Arial Black', Arial, sans-serif"
        fill="#fef08a"
        stroke="#b45309"
        strokeWidth="2"
        paintOrder="stroke"
        filter="url(#svnGlow)"
      >7</text>
      <ellipse cx="22" cy="18" rx="9" ry="5" fill="rgba(255,255,255,0.22)" transform="rotate(-28 22 18)" />
    </svg>
  );
}

function SymbolIcon({ id, size = 52 }: { id: string; size?: number }) {
  switch (id) {
    case "cherry":  return <CherryIcon size={size} />;
    case "lemon":   return <LemonIcon size={size} />;
    case "orange":  return <OrangeIcon size={size} />;
    case "grape":   return <GrapeIcon size={size} />;
    case "star":    return <StarIcon size={size} />;
    case "diamond": return <DiamondIcon size={size} />;
    case "seven":   return <SevenIcon size={size} />;
    default:        return <span style={{ fontSize: size * 0.65 }}>?</span>;
  }
}

// ─── Reel Component ─────────────────────────────────────────────────────────────

interface ReelProps {
  finalSymbols: Symbol[];
  spinKey: number;
  stopDelay: number;
  winRows: Set<number>;
}

function ReelComponent({ finalSymbols, spinKey, stopDelay, winRows }: ReelProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [tape, setTape] = useState<Symbol[]>(finalSymbols);
  const [stopped, setStopped] = useState(true);
  const isAnimatingRef = useRef(false);
  const prevKey = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger new spin: build tape, mark as animating
  useEffect(() => {
    if (spinKey === 0 || spinKey === prevKey.current) return;
    prevKey.current = spinKey;
    isAnimatingRef.current = true;
    setStopped(false);

    const randomPart: Symbol[] = Array.from({ length: STRIP_EXTRA }, () =>
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    );
    setTape([...randomPart, ...finalSymbols]);

    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      isAnimatingRef.current = false;
      setStopped(true);
    }, stopDelay + 180);
  }, [spinKey, finalSymbols, stopDelay]);

  // After tape state flushes to DOM: reset position then animate scroll
  useEffect(() => {
    if (!isAnimatingRef.current) return;
    const strip = stripRef.current;
    if (!strip) return;

    strip.style.transition = "none";
    strip.style.transform = "translateY(0px)";

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!stripRef.current || !isAnimatingRef.current) return;
        const targetY = -(STRIP_EXTRA * SLOT_H);
        stripRef.current.style.transition = `transform ${stopDelay}ms cubic-bezier(0.22, 1.15, 0.36, 1)`;
        stripRef.current.style.transform = `translateY(${targetY}px)`;
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [tape, stopDelay]);

  return (
    <div
      style={{
        height: ROW_COUNT * SLOT_H,
        overflow: "hidden",
        position: "relative",
        borderRadius: 12,
        background: "#060d18",
        border: "1px solid #1e3a5f",
        boxShadow: "inset 0 0 20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)",
        filter: stopped ? "none" : "blur(1.5px)",
        transition: stopped ? "filter 0.28s ease-out" : "filter 0.08s ease-in",
      }}
    >
      {/* top/bottom depth gradient */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", borderRadius: 12,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.65) 100%)",
        }}
      />
      {/* center row highlight */}
      <div
        style={{
          position: "absolute",
          top: SLOT_H,
          left: 0, right: 0,
          height: SLOT_H,
          border: "1px solid rgba(255,255,255,0.04)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
      {/* symbol strip */}
      <div ref={stripRef} style={{ transform: "translateY(0px)" }}>
        {tape.map((sym, i) => {
          const rowIdx = i - STRIP_EXTRA;
          const isWin = stopped && rowIdx >= 0 && rowIdx < ROW_COUNT && winRows.has(rowIdx);
          return (
            <div
              key={i}
              style={{
                height: SLOT_H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isWin
                  ? "linear-gradient(160deg, #1c1400 0%, #2d2000 100%)"
                  : "linear-gradient(160deg, #0a1628 0%, #0f1e35 100%)",
                borderBottom: i < tape.length - 1 ? "1px solid #0f1f35" : "none",
                boxShadow: isWin ? "inset 0 0 24px rgba(250,204,21,0.12)" : undefined,
                transition: "background 0.35s, box-shadow 0.35s",
              }}
            >
              <div
                style={{
                  transform: isWin ? "scale(1.15)" : "scale(1)",
                  transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  filter: isWin
                    ? "drop-shadow(0 0 10px rgba(250,204,21,0.75)) drop-shadow(0 0 20px rgba(250,204,21,0.4))"
                    : "drop-shadow(0 3px 6px rgba(0,0,0,0.6))",
                }}
              >
                <SymbolIcon id={sym.id} size={46} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Win Cell Border Overlay ─────────────────────────────────────────────────────

function WinCellBorder({ active }: { active: boolean }) {
  return (
    <div
      style={{
        position: "absolute", inset: 0,
        borderRadius: 12,
        border: active ? "2px solid #facc15" : "2px solid transparent",
        boxShadow: active ? "0 0 16px rgba(250,204,21,0.55), inset 0 0 16px rgba(250,204,21,0.08)" : undefined,
        pointerEvents: "none",
        transition: "border-color 0.3s, box-shadow 0.3s",
        zIndex: 4,
      }}
    />
  );
}

// ─── Coin Particle Burst ──────────────────────────────────────────────────────

function ParticleBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const COLORS = ["#facc15","#fbbf24","#f59e0b","#a855f7","#ec4899","#34d399","#60a5fa","#fb923c"];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 30, overflow: "visible" }}>
      {Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2 - Math.PI / 2;
        const dist = 90 + (i % 4) * 35;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const color = COLORS[i % COLORS.length];
        const size = 5 + (i % 5);
        const delay = (i % 7) * 0.04;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%", top: "42%",
              width: size, height: size,
              borderRadius: i % 3 === 0 ? "2px" : "50%",
              background: color,
              "--dx": `${dx}px`,
              "--dy": `${dy}px`,
              animation: `burstParticle 1.3s ease-out ${delay}s both`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

// ─── Spin History ─────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: number;
  bet: number;
  win: number;
  emoji: string;
  freeSpin?: boolean;
}

interface FreeSpinState {
  active: boolean;
  remaining: number;
  accumulated: number;
  done: number; // spins completed so far
}

// ─── Main Component ───────────────────────────────────────────────────────────

// Animation phases for cascade flow
type GamePhase = "idle" | "spinning" | "highlighting" | "popping" | "falling";

export default function GameClient({ initialBalance }: { initialBalance: number }) {
  const [balance, setBalance] = useState(initialBalance);
  const [bet, setBet] = useState<BetOption>(10);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [winResult, setWinResult] = useState<WinResult | null>(null);
  const [spinTotalWin, setSpinTotalWin] = useState(0);
  const [showWinBanner, setShowWinBanner] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const historyId = useRef(0);

  const [spinKey] = useState(0); // kept for compatibility, not actively used
  // Grid used by both the reel strip (spin) and cascade cell view
  const [cascadeGrid, setCascadeGrid] = useState<Symbol[][]>(() =>
    Array.from({ length: REEL_COUNT }, () =>
      Array.from({ length: ROW_COUNT }, () => SYMBOLS[0])
    )
  );
  // Which cells are currently winning (highlighted / popping)
  const [winningCells, setWinningCells] = useState<Set<string>>(new Set());
  // Which cells just appeared from cascade (fall-in animation)
  const [newCells, setNewCells] = useState<Set<string>>(new Set());

  // Free spin state
  const [freeSpins, setFreeSpins] = useState<FreeSpinState>({
    active: false, remaining: 0, accumulated: 0, done: 0,
  });
  const [showFreeSpinResult, setShowFreeSpinResult] = useState(false);
  const [lastFreeSpinTotal, setLastFreeSpinTotal] = useState(0);
  const freeSpinBetRef = useRef<BetOption>(10);
  const [multiplierCells, setMultiplierCells] = useState<MultiplierCell[]>([]);
  const [multiplierPopping, setMultiplierPopping] = useState(false);
  const multiplierTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const isSpinning = phase !== "idle" || isLoading;

  // Core spin executor — async, fetches result from server then animates
  const executeSpin = useCallback(async (isFreeSpin: boolean) => {
    if (isSpinning) return;
    if (!isFreeSpin && balance < bet) return;

    // Block new spins while waiting for API (phase stays "idle" so old grid shows cleanly)
    setIsLoading(true);
    setWinResult(null);
    setShowWinBanner(false);
    setShowParticles(false);
    if (multiplierTimerRef.current) {
      clearTimeout(multiplierTimerRef.current);
      multiplierTimerRef.current = null;
    }

    // Optimistic balance deduction for normal spin
    if (!isFreeSpin) setBalance(b => b - bet);

    try {
      const endpoint = isFreeSpin ? "/api/game/freespin" : "/api/game/spin";
      const body = isFreeSpin ? {} : { bet };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        if (!isFreeSpin) setBalance(b => b + bet); // revert
        setIsLoading(false);
        console.error("Spin error:", err.error);
        return;
      }

      const data: SimulationResult & {
        newBalance: number;
        remaining?: number;
        accumulated?: number;
        isLast?: boolean;
      } = await res.json();

      // Update grid BEFORE animation starts — symbols will be correct from frame 1
      const grid = data.initialGrid.map(col =>
        col.map(s => SYMBOLS.find(sym => sym.id === s.id)!)
      );
      setCascadeGrid(grid);
      setMultiplierCells(data.initialMultiplierCells);
      setMultiplierPopping(false);

      // Now start the waterfall animation with the correct grid
      setIsLoading(false);
      setPhase("spinning");

      await new Promise(r => setTimeout(r, SPIN_TOTAL_MS + 260));

      // Play cascade steps
      for (const step of data.steps) {
        if (step.type === "win") {
          const winSet = new Set<string>(
            step.winLines.flatMap(c => c.cells.map(([row, col]) => `${col},${row}`))
          );
          setWinResult({ totalWin: step.winLines.reduce((s, c) => s + c.amount, 0), winLines: step.winLines });
          setWinningCells(winSet);
          setPhase("highlighting");
          await new Promise(r => setTimeout(r, 660));
          setPhase("popping");
          await new Promise(r => setTimeout(r, 380));
        } else {
          const newGrid = step.grid.map(col =>
            col.map(s => SYMBOLS.find(sym => sym.id === s.id)!)
          );
          setCascadeGrid(newGrid);
          setMultiplierCells(step.multiplierCells);
          setWinningCells(new Set());
          setNewCells(new Set(step.newCells));
          setPhase("falling");
          await new Promise(r => setTimeout(r, 430));
          setNewCells(new Set());
        }
      }

      // Multiplier pop
      const finalMultipliers = data.steps.length > 0
        ? [...data.steps].reverse().find(s => s.type === "fall")?.multiplierCells ?? data.initialMultiplierCells
        : data.initialMultiplierCells;

      if (finalMultipliers.length > 0) {
        const triggerPop = () => {
          setMultiplierPopping(true);
          multiplierTimerRef.current = setTimeout(() => {
            setMultiplierCells([]);
            setMultiplierPopping(false);
            multiplierTimerRef.current = null;
          }, 460);
        };
        if (data.totalWin === 0) {
          multiplierTimerRef.current = setTimeout(triggerPop, 520);
        } else {
          triggerPop();
        }
      }

      setPhase("idle");

      // Update balance & state
      if (isFreeSpin) {
        const newRemaining = data.remaining ?? 0;
        const newAccumulated = data.accumulated ?? 0;
        setFreeSpins(prev => ({
          ...prev,
          remaining: newRemaining,
          accumulated: newAccumulated,
          done: prev.done + 1,
        }));
        if (data.isLast) {
          setBalance(data.newBalance);
          const total = newAccumulated;
          setLastFreeSpinTotal(total);
          setFreeSpins({ active: false, remaining: 0, accumulated: 0, done: 0 });
          setShowFreeSpinResult(true);
          setShowParticles(total > 0);
          setTimeout(() => { setShowFreeSpinResult(false); setShowParticles(false); }, 4500);
        }
      } else {
        setBalance(data.newBalance);
        if (data.totalWin > 0) {
          setSpinTotalWin(data.totalWin);
          setShowWinBanner(true);
          setShowParticles(true);
          setTimeout(() => { setShowWinBanner(false); setShowParticles(false); }, 3200);
        }
      }

      // History entry
      const firstWin = data.steps.find(s => s.type === "win") as (CascadeStep & { type: "win" }) | undefined;
      const emoji = firstWin?.winLines?.[0]
        ? SYMBOLS.find(s => s.id === firstWin.winLines[0].symbolId)?.emoji ?? "🎰"
        : "-";
      const activeBet = isFreeSpin ? freeSpinBetRef.current : bet;
      setHistory(prev => [
        { id: ++historyId.current, bet: activeBet, win: data.totalWin, emoji, freeSpin: isFreeSpin },
        ...prev,
      ].slice(0, 5));

    } catch (e) {
      console.error("Spin error:", e);
      if (!isFreeSpin) setBalance(b => b + bet); // revert on error
      setPhase("idle");
    }
  }, [isSpinning, balance, bet]);

  // Auto-trigger free spins
  useEffect(() => {
    if (!freeSpins.active || isSpinning) return;
    if (freeSpins.remaining <= 0) return; // server handles last spin payout

    const t = setTimeout(() => executeSpin(true), 900);
    return () => clearTimeout(t);
  }, [freeSpins.active, freeSpins.remaining, isSpinning, executeSpin]);

  const handleSpin = useCallback(() => {
    if (freeSpins.active) return;
    executeSpin(false);
  }, [freeSpins.active, executeSpin]);

  const buyFreeSpins = useCallback(async () => {
    const cost = bet * FREE_SPIN_COST_MULT;
    if (isSpinning || freeSpins.active || balance < cost) return;

    setBalance(b => b - cost);

    const res = await fetch("/api/game/buy-freespins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet }),
    });

    if (!res.ok) {
      setBalance(b => b + cost);
      const err = await res.json();
      console.error("Buy free spins error:", err.error);
      return;
    }

    const data = await res.json();
    setBalance(data.newBalance);
    freeSpinBetRef.current = bet;
    setFreeSpins({ active: true, remaining: data.remaining, accumulated: 0, done: 0 });
  }, [isSpinning, freeSpins.active, balance, bet]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) { e.preventDefault(); handleSpin(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSpin]);

  const canSpin = !isSpinning && !freeSpins.active && balance >= bet;
  const canBuyFreeSpins = !isSpinning && !freeSpins.active && balance >= bet * FREE_SPIN_COST_MULT;
  const freeSpinCost = bet * FREE_SPIN_COST_MULT;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 0%, #0f172a 0%, #080d18 55%, #040810 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 780, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <Link
          href="/"
          style={{
            color: "#64748b", fontSize: 13, textDecoration: "none",
            display: "flex", alignItems: "center", gap: 4,
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
        >
          ← Ana Sayfa
        </Link>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 9, letterSpacing: "0.3em", color: "#475569",
            textTransform: "uppercase", marginBottom: 2,
          }}>
            Classic
          </div>
          <h1 style={{
            fontSize: 22, fontWeight: 900, letterSpacing: "0.18em",
            color: "transparent",
            background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #fcd34d 70%, #f59e0b 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            textTransform: "uppercase",
            margin: 0,
            textShadow: "none",
          }}>
            Slot Machine
          </h1>
        </div>
        <div style={{ width: 80 }} />
      </div>

      {/* Cabinet */}
      <div
        style={{
          width: "100%", maxWidth: 780,
          borderRadius: 20,
          background: "linear-gradient(180deg, #0d1829 0%, #091220 100%)",
          border: freeSpins.active ? "1px solid #b45309" : "1px solid #1e3a5f",
          boxShadow: freeSpins.active
            ? "0 0 60px rgba(251,191,36,0.18), 0 0 120px rgba(251,191,36,0.08), 0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)"
            : "0 0 60px rgba(59,130,246,0.08), 0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
          overflow: "hidden",
          position: "relative",
          transition: "border-color 0.4s, box-shadow 0.4s",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 24px",
            background: "linear-gradient(180deg, #0f1f38 0%, #0a1628 100%)",
            borderBottom: "1px solid #1e3a5f",
          }}
        >
          {/* Balance */}
          <div>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 3 }}>
              Bakiye
            </div>
            <div style={{
              fontSize: 26, fontWeight: 800, color: "#fbbf24",
              letterSpacing: "0.02em",
              textShadow: "0 0 16px rgba(251,191,36,0.45)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {balance.toLocaleString()}
              <span style={{ fontSize: 13, color: "#d97706", marginLeft: 4, fontWeight: 600 }}>kr</span>
            </div>
          </div>

          {/* Bet selector */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.18em", textTransform: "uppercase" }}>
              Bahis
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {BET_OPTIONS.map((b) => (
                <button
                  key={b}
                  onClick={() => !isSpinning && !freeSpins.active && setBet(b)}
                  disabled={isSpinning || freeSpins.active}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: (isSpinning || freeSpins.active) ? "not-allowed" : "pointer",
                    border: bet === b ? "1px solid #3b82f6" : "1px solid #1e3a5f",
                    background: bet === b
                      ? "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)"
                      : "#0a1628",
                    color: bet === b ? "#fff" : "#64748b",
                    boxShadow: bet === b ? "0 0 12px rgba(59,130,246,0.35)" : "none",
                    transition: "all 0.15s",
                    opacity: (isSpinning || freeSpins.active) ? 0.4 : 1,
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Right panel: free spin counter or last win */}
          <div style={{ textAlign: "right", minWidth: 110 }}>
            {freeSpins.active ? (
              <>
                <div style={{ fontSize: 9, color: "#b45309", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 3, fontWeight: 700 }}>
                  Free Spin
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#fbbf24", textShadow: "0 0 16px rgba(251,191,36,0.6)", fontVariantNumeric: "tabular-nums" }}>
                  {freeSpins.done + (isSpinning ? 0 : 0)}<span style={{ fontSize: 14, color: "#78350f", margin: "0 2px" }}>/</span>{FREE_SPIN_COUNT}
                </div>
                <div style={{ fontSize: 11, color: "#92400e", marginTop: 1, fontVariantNumeric: "tabular-nums" }}>
                  Biriken: <span style={{ color: "#fbbf24", fontWeight: 700 }}>{freeSpins.accumulated.toLocaleString()} kr</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 3 }}>
                  Son Kazanç
                </div>
                <div style={{
                  fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums",
                  color: spinTotalWin > 0 ? "#4ade80" : "#1e3a5f",
                  textShadow: spinTotalWin > 0 ? "0 0 16px rgba(74,222,128,0.45)" : "none",
                  transition: "color 0.4s, text-shadow 0.4s",
                }}>
                  {spinTotalWin.toLocaleString()}
                  <span style={{ fontSize: 13, marginLeft: 4, fontWeight: 600, opacity: 0.65 }}>kr</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Reel grid area */}
        <div style={{ padding: "20px 20px 12px", position: "relative" }}>
          {/* Free spin active overlay bar */}
          {freeSpins.active && (
            <div style={{
              marginBottom: 10,
              borderRadius: 10,
              padding: "8px 14px",
              background: "linear-gradient(135deg, #1c0f00 0%, #2d1a00 100%)",
              border: "1px solid #92400e",
              boxShadow: "0 0 20px rgba(251,191,36,0.12)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                  background: "#fbbf24",
                  boxShadow: "0 0 8px #fbbf24",
                  animation: "freeSpinPulse 1s ease-in-out infinite",
                }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: "#fbbf24", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Free Spin Aktif
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "#78350f", letterSpacing: "0.12em", textTransform: "uppercase" }}>Kalan</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#fbbf24", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                    {freeSpins.remaining}
                  </div>
                </div>
                <div style={{ width: 1, height: 28, background: "#78350f" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "#78350f", letterSpacing: "0.12em", textTransform: "uppercase" }}>Biriken</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#4ade80", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                    {freeSpins.accumulated.toLocaleString()} kr
                  </div>
                </div>
                <div style={{ width: 1, height: 28, background: "#78350f" }} />
                {/* Active multipliers — always visible during free spins */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "#78350f", letterSpacing: "0.12em", textTransform: "uppercase" }}>Çarpan</div>
                  <div style={{
                    fontSize: 18, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums",
                    color: multiplierCells.length > 0 ? "#fbbf24" : "#78350f",
                    textShadow: multiplierCells.length > 0 ? "0 0 14px rgba(251,191,36,0.85)" : "none",
                  }}>
                    {multiplierCells.reduce((s, m) => s + m.value, 0) || "—"}×
                  </div>
                </div>
                <div style={{ width: 1, height: 28, background: "#78350f" }} />
                {/* progress bar */}
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 9, color: "#78350f", letterSpacing: "0.12em", textTransform: "uppercase" }}>İlerleme</div>
                  <div style={{ width: 80, height: 6, borderRadius: 3, background: "#1c0f00", border: "1px solid #78350f", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${(freeSpins.done / FREE_SPIN_COUNT) * 100}%`,
                      background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                      borderRadius: 3,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                  <div style={{ fontSize: 9, color: "#78350f", textAlign: "right" }}>{freeSpins.done}/{FREE_SPIN_COUNT}</div>
                </div>
              </div>
            </div>
          )}

          {/* Free spin result banner */}
          {showFreeSpinResult && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 25,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.72)",
              pointerEvents: "none",
            }}>
              <div style={{
                borderRadius: 22,
                padding: "28px 52px",
                textAlign: "center",
                background: "linear-gradient(160deg, #1c0f00 0%, #0d0a00 100%)",
                border: "2px solid #fbbf24",
                boxShadow: "0 0 60px rgba(251,191,36,0.5), 0 0 120px rgba(251,191,36,0.18)",
                animation: "winBannerIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
              }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>🎰✨</div>
                <div style={{ fontSize: 11, color: "#b45309", letterSpacing: "0.32em", textTransform: "uppercase", fontWeight: 800, marginBottom: 4 }}>
                  10 Free Spin Bitti!
                </div>
                <div style={{ fontSize: 13, color: "#78350f", marginBottom: 12 }}>
                  Toplam kazanç bakiyene eklendi
                </div>
                <div style={{
                  fontSize: 56, fontWeight: 900, color: "#fff",
                  textShadow: "0 0 28px rgba(251,191,36,0.95)",
                  fontVariantNumeric: "tabular-nums", lineHeight: 1,
                }}>
                  +{lastFreeSpinTotal.toLocaleString()}
                </div>
                <div style={{ fontSize: 14, color: "#fbbf24", marginTop: 4, fontWeight: 700 }}>kr</div>
              </div>
            </div>
          )}

          {/* Regular win banner */}
          {showWinBanner && winResult && winResult.totalWin > 0 && (
            <div
              style={{
                position: "absolute", inset: 0, zIndex: 20,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.6)",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  borderRadius: 20,
                  padding: "24px 44px",
                  textAlign: "center",
                  background: "linear-gradient(160deg, #0f1f38 0%, #080d18 100%)",
                  border: "2px solid #fbbf24",
                  boxShadow: "0 0 50px rgba(251,191,36,0.4), 0 0 100px rgba(251,191,36,0.15)",
                  animation: "winBannerIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 4, filter: "drop-shadow(0 0 8px rgba(251,191,36,0.8))" }}>🎰</div>
                <div style={{
                  fontSize: 12, color: "#fbbf24", letterSpacing: "0.28em",
                  textTransform: "uppercase", fontWeight: 700, marginBottom: 6,
                }}>
                  Kazandın!
                </div>
                <div style={{
                  fontSize: 52, fontWeight: 900, color: "#fff",
                  textShadow: "0 0 24px rgba(251,191,36,0.9)",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}>
                  +{spinTotalWin.toLocaleString()}
                  <span style={{ fontSize: 24, color: "#fbbf24", marginLeft: 6, fontWeight: 700 }}>kr</span>
                </div>
                {winResult && winResult.winLines.length > 1 && (
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                    {winResult.winLines.length} kazanan küme
                  </div>
                )}
              </div>
            </div>
          )}

          <ParticleBurst active={showParticles} />

          {/* Grid — reel strips during spin, individual cells otherwise */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${REEL_COUNT}, 1fr)`, gap: 5 }}>
            {Array.from({ length: REEL_COUNT }, (_, col) => (
              phase === "spinning" ? (
                /* Column waterfall — symbols fall in top-to-bottom, column by column */
                <div
                  key={col}
                  style={{
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#060d18",
                    border: "1px solid #1e3a5f",
                    boxShadow: "inset 0 0 20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)",
                    position: "relative",
                  }}
                >
                  {/* top/bottom depth fade */}
                  <div style={{
                    position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", borderRadius: 12,
                    background: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.65) 100%)",
                  }} />
                  {Array.from({ length: ROW_COUNT }, (_, row) => {
                    const delay = col * SPIN_COL_DELAY + (ROW_COUNT - 1 - row) * SPIN_ROW_STAGGER;
                    return (
                      <div
                        key={row}
                        style={{
                          height: SLOT_H,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "linear-gradient(160deg, #0a1628 0%, #0f1e35 100%)",
                          borderBottom: row < ROW_COUNT - 1 ? "1px solid #0f1f35" : "none",
                          animation: `cellSpinFallIn ${SPIN_FALL_MS}ms cubic-bezier(0.16, 1, 0.3, 1) both`,
                          animationDelay: `${delay}ms`,
                        }}
                      >
                        {!multiplierCells.some(m => m.col === col && m.row === row) && (
                          <div style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.6))" }}>
                            <SymbolIcon id={cascadeGrid[col][row].id} size={46} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Multiplier overlays — appear when their cell lands */}
                  {multiplierCells.filter(m => m.col === col).map((m, i) => {
                    const mDelay = col * SPIN_COL_DELAY + (ROW_COUNT - 1 - m.row) * SPIN_ROW_STAGGER + SPIN_FALL_MS;
                    return (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          top: m.row * SLOT_H + 2,
                          left: 2, right: 2,
                          height: SLOT_H - 4,
                          zIndex: 10,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center",
                          background: "rgba(28, 10, 0, 0.90)",
                          borderRadius: 8,
                          animation: "multiplierAppear 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                          animationDelay: `${mDelay}ms`,
                        }}
                      >
                        <div style={{ fontSize: 8, color: "#92400e", letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 800, lineHeight: 1, marginBottom: 2 }}>
                          çarpan
                        </div>
                        <div style={{
                          fontSize: 26, fontWeight: 900, color: "#fbbf24", lineHeight: 1,
                          textShadow: "0 0 18px rgba(251,191,36,0.95), 0 0 36px rgba(251,191,36,0.45)",
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          {m.value}×
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Cascade cell view */
                <div
                  key={col}
                  style={{
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#060d18",
                    border: "1px solid #1e3a5f",
                    boxShadow: "inset 0 0 20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)",
                    position: "relative",
                  }}
                >
                  {/* top/bottom depth fade */}
                  <div style={{
                    position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", borderRadius: 12,
                    background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.6) 100%)",
                  }} />
                  {Array.from({ length: ROW_COUNT }, (_, row) => {
                    const key = `${col},${row}`;
                    const isWin = winningCells.has(key);
                    const isNew = newCells.has(key);
                    const anim = isWin && phase === "highlighting"
                      ? "cellGlow 0.65s ease-in-out infinite"
                      : isWin && phase === "popping"
                      ? "cellPop 380ms linear forwards"
                      : isNew && phase === "falling"
                      ? "cellFallIn 400ms ease-out"
                      : undefined;
                    const animDelay = isNew && phase === "falling"
                      ? `${Math.min(row, 3) * 22}ms`
                      : undefined;
                    return (
                      <div
                        key={row}
                        style={{
                          height: SLOT_H,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: isWin
                            ? "linear-gradient(160deg, #1c1400 0%, #2d2000 100%)"
                            : "linear-gradient(160deg, #0a1628 0%, #0f1e35 100%)",
                          borderBottom: row < ROW_COUNT - 1 ? "1px solid #0f1f35" : "none",
                          boxShadow: isWin && phase !== "highlighting" ? "inset 0 0 24px rgba(250,204,21,0.12)" : undefined,
                          animation: anim,
                          animationDelay: animDelay,
                          position: "relative",
                        }}
                      >
                        {(() => {
                          const mc = multiplierCells.find(m => m.col === col && m.row === row);
                          if (mc) return null;
                          return (
                            <div style={{
                              transform: isWin ? "scale(1.22)" : "scale(1)",
                              transition: "transform 0.35s cubic-bezier(0.34,1.72,0.64,1), filter 0.3s ease",
                              filter: isWin
                                ? "drop-shadow(0 0 12px rgba(250,204,21,0.9)) drop-shadow(0 0 28px rgba(250,204,21,0.5))"
                                : "drop-shadow(0 3px 6px rgba(0,0,0,0.6))",
                            }}>
                              <SymbolIcon id={cascadeGrid[col][row].id} size={46} />
                            </div>
                          );
                        })()}
                        {/* Multiplier overlay cell */}
                        {(() => {
                          const mc = multiplierCells.find(m => m.col === col && m.row === row);
                          if (!mc) return null;
                          return (
                            <div style={{
                              position: "absolute", inset: 0, zIndex: 10,
                              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                              background: "rgba(28, 10, 0, 0.90)",
                              animation: multiplierPopping
                                ? "cellPop 380ms forwards"
                                : "multiplierAppear 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                            }}>
                              <div style={{ fontSize: 8, color: "#92400e", letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 800, lineHeight: 1, marginBottom: 2 }}>
                                çarpan
                              </div>
                              <div style={{
                                fontSize: 26, fontWeight: 900, color: "#fbbf24", lineHeight: 1,
                                textShadow: "0 0 18px rgba(251,191,36,0.95), 0 0 36px rgba(251,191,36,0.45)",
                                fontVariantNumeric: "tabular-nums",
                              }}>
                                {mc.value}×
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )
            ))}
          </div>

          {/* Cluster info */}
          {winResult && winResult.winLines.length > 0 && phase !== "spinning" && (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              {winResult.winLines.map((cluster, idx) => (
                <span
                  key={idx}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 700,
                    background: "#1c1400", color: "#fbbf24",
                    border: "1px solid #b45309",
                    boxShadow: "0 0 10px rgba(251,191,36,0.25)",
                  }}
                >
                  <SymbolIcon id={cluster.symbolId} size={16} />
                  {cluster.matchCount}×
                  <span style={{ color: "#f59e0b" }}>+{cluster.amount} kr</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Spin button */}
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleSpin}
            disabled={!canSpin}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 14,
              fontSize: 17,
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: canSpin ? "pointer" : "not-allowed",
              border: canSpin ? "1px solid #3b82f6" : "1px solid #1e3a5f",
              background: canSpin
                ? "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #1e40af 100%)"
                : "#0a1628",
              color: canSpin ? "#fff" : "#334155",
              boxShadow: canSpin
                ? "0 6px 28px rgba(37,99,235,0.45), 0 1px 0 rgba(255,255,255,0.08) inset"
                : "none",
              transform: isSpinning ? "scale(0.98)" : "scale(1)",
              transition: "all 0.15s",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {canSpin && (
              <div
                style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)",
                  animation: "shimmer 2.5s ease-in-out infinite",
                }}
              />
            )}
            {isSpinning ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span
                  style={{
                    display: "inline-block", width: 18, height: 18,
                    border: "2.5px solid rgba(255,255,255,0.25)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "rotateSpin 0.65s linear infinite",
                  }}
                />
                Çevriliyor...
              </span>
            ) : balance < bet ? (
              "Yetersiz Bakiye"
            ) : (
              "▶ Çevir"
            )}
          </button>
          {/* Free Spin buy button */}
          {!freeSpins.active && (
            <button
              onClick={buyFreeSpins}
              disabled={!canBuyFreeSpins}
              style={{
                width: "100%",
                padding: "11px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: canBuyFreeSpins ? "pointer" : "not-allowed",
                border: canBuyFreeSpins ? "1px solid #b45309" : "1px solid #1e2a1a",
                background: canBuyFreeSpins
                  ? "linear-gradient(135deg, #78350f 0%, #92400e 50%, #78350f 100%)"
                  : "#0a1010",
                color: canBuyFreeSpins ? "#fde68a" : "#334155",
                boxShadow: canBuyFreeSpins
                  ? "0 4px 20px rgba(180,83,9,0.35), inset 0 1px 0 rgba(255,255,255,0.06)"
                  : "none",
                transition: "all 0.15s",
                opacity: canBuyFreeSpins ? 1 : 0.4,
              }}
            >
              ✦ Free Spin Satın Al — {freeSpinCost} kr ({FREE_SPIN_COUNT} spin)
            </button>
          )}
          <p style={{ fontSize: 11, color: "#334155", margin: 0 }}>
            <span style={{ fontFamily: "monospace", color: "#475569" }}>Space</span> tuşuna da basabilirsin
          </p>
        </div>

        {/* Cluster win detail */}
        {winResult && winResult.winLines.length > 0 && phase !== "spinning" && (
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{
              borderRadius: 12, background: "#0a1628",
              border: "1px solid #1e3a5f", padding: "12px 14px",
            }}>
              <p style={{ fontSize: 9, color: "#475569", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 8px" }}>
                Kazanan Kümeler
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {winResult.winLines.map((cluster, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8" }}>
                      <SymbolIcon id={cluster.symbolId} size={22} />
                      <span style={{ color: "#475569" }}>
                        {cluster.matchCount} sembol · {cluster.matchCount}× {SYMBOLS.find(s => s.id === cluster.symbolId)?.clusterValue ?? 0} kr
                      </span>
                    </span>
                    <span style={{ color: "#fbbf24", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      +{cluster.amount.toLocaleString()} kr
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div style={{ padding: "0 20px 20px" }}>
            <div style={{
              borderRadius: 12, background: "#0a1628",
              border: "1px solid #1e3a5f", padding: "12px 14px",
            }}>
              <p style={{ fontSize: 9, color: "#475569", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 8px" }}>
                Son 5 Oyun
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {history.map((entry, i) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      fontSize: 12,
                      opacity: Math.max(0.3, 1 - i * 0.18),
                    }}
                  >
                    <span style={{ color: "#334155", width: 16, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                    <span style={{ color: "#475569", flex: 1, marginLeft: 8 }}>
                      Bahis: <span style={{ color: "#64748b" }}>{entry.bet} kr</span>
                    </span>
                    <span style={{
                      fontWeight: 700, fontVariantNumeric: "tabular-nums",
                      color: entry.win > 0 ? "#4ade80" : "#334155",
                    }}>
                      {entry.win > 0 ? `+${entry.win.toLocaleString()} kr ${entry.emoji}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes rotateSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes winBannerIn {
          0%   { transform: scale(0.75); opacity: 0; }
          60%  { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes burstParticle {
          0%   { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes cellPop {
          0%   { transform: scale(1);    opacity: 1;   filter: brightness(1); }
          18%  { transform: scale(1.5);  opacity: 1;   filter: brightness(2.8); }
          50%  { transform: scale(0.75); opacity: 0.55; filter: brightness(1.3); }
          100% { transform: scale(0);    opacity: 0;   filter: brightness(1); }
        }
        @keyframes cellSpinFallIn {
          0%   { transform: translateY(-60px); opacity: 0; }
          22%  { opacity: 1; }
          76%  { transform: translateY(5px); }
          91%  { transform: translateY(-1px); }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes cellFallIn {
          0%   { transform: translateY(-80px) scaleY(0.82); opacity: 0; }
          28%  { opacity: 1; }
          68%  { transform: translateY(7px) scaleY(1.05); }
          84%  { transform: translateY(-3px) scaleY(0.98); }
          100% { transform: translateY(0) scaleY(1); opacity: 1; }
        }
        @keyframes cellGlow {
          0%, 100% { box-shadow: inset 0 0 18px rgba(250,204,21,0.08), 0 0 0px rgba(250,204,21,0); }
          50%       { box-shadow: inset 0 0 36px rgba(250,204,21,0.45), 0 0 18px rgba(250,204,21,0.22); }
        }
        @keyframes freeSpinPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.55; transform: scale(1.35); }
        }
        @keyframes multiplierAppear {
          0%   { transform: scale(0);    opacity: 0; }
          60%  { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </main>
  );
}
