import { useMemo, useState } from "react";
import { ArrowLeft, Check, X, RotateCcw, Home } from "lucide-react";
import orcaMascot from "@/assets/orca-mascot.png";
import { TRIVIA_QUESTIONS, getTierForScore, type TriviaQuestion } from "@/lib/trivia-data";

type Phase = "playing" | "results";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function TriviaGame({ onExit }: { onExit: () => void }) {
  const [seed, setSeed] = useState(0);
  const questions = useMemo<TriviaQuestion[]>(() => shuffle(TRIVIA_QUESTIONS), [seed]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [phase, setPhase] = useState<Phase>("playing");

  const q = questions[index];
  const progress = ((index + (phase === "results" ? 1 : 0)) / questions.length) * 100;

  function pick(i: number) {
    if (locked) return;
    setSelected(i);
    setLocked(true);
    const correct = i === q.correctIndex;
    if (correct) setScore((s) => s + 1);
    setTimeout(() => {
      if (index + 1 >= questions.length) {
        setPhase("results");
      } else {
        setIndex((n) => n + 1);
        setSelected(null);
        setLocked(false);
      }
    }, 950);
  }

  function playAgain() {
    setSeed((n) => n + 1);
    setIndex(0);
    setScore(0);
    setSelected(null);
    setLocked(false);
    setPhase("playing");
  }

  return (
    <div className="min-h-screen px-4 sm:px-8 pb-24">
      <header className="mx-auto max-w-3xl pt-8 sm:pt-12 flex items-center justify-between gap-4">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> All Games
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xl">🐋</span>
          <span className="font-display font-semibold">Orca Trivia</span>
        </div>
      </header>

      {phase === "playing" ? (
        <section className="mx-auto max-w-3xl mt-10 sm:mt-14">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 mb-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-accent/90">Question {index + 1} of {questions.length}</p>
            </div>
            <p className="shrink-0 text-xs text-muted-foreground tabular-nums">Score {score}</p>
          </div>

          <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden mb-8">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, background: "var(--gradient-ocean)" }}
            />
          </div>

          <div key={index} className="animate-pop rounded-3xl border border-border/70 bg-card/70 backdrop-blur p-6 sm:p-10 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold leading-snug tracking-tight">
              {q.question}
            </h2>

            <div className={`mt-8 grid gap-3 ${q.options.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}>
              {q.options.map((opt, i) => {
                const isCorrect = i === q.correctIndex;
                const isPicked = selected === i;
                const reveal = locked;
                const state = !reveal
                  ? "idle"
                  : isCorrect
                    ? "correct"
                    : isPicked
                      ? "wrong"
                      : "dim";

                return (
                  <button
                    key={i}
                    onClick={() => pick(i)}
                    disabled={locked}
                    className={[
                      "group relative text-left rounded-2xl border px-5 py-4 sm:py-5 transition-all duration-200",
                      "flex items-center gap-3",
                      state === "idle" &&
                        "border-border/70 bg-secondary/40 hover:border-cyan-accent/60 hover:bg-secondary/70 hover:-translate-y-0.5 cursor-pointer",
                      state === "correct" && "border-success bg-success/15 text-foreground",
                      state === "wrong" && "border-destructive bg-destructive/15 text-foreground",
                      state === "dim" && "border-border/40 opacity-50",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span
                      className={[
                        "grid place-items-center size-8 shrink-0 rounded-lg text-xs font-semibold",
                        state === "idle" && "bg-background/60 text-muted-foreground group-hover:text-foreground",
                        state === "correct" && "bg-success text-success-foreground",
                        state === "wrong" && "bg-destructive text-destructive-foreground",
                        state === "dim" && "bg-background/40 text-muted-foreground",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {state === "correct" ? <Check className="size-4" /> : state === "wrong" ? <X className="size-4" /> : String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm sm:text-base font-medium min-w-0">{opt}</span>
                  </button>
                );
              })}
            </div>

            {locked && q.note && (
              <p className="mt-5 text-xs sm:text-sm text-muted-foreground italic animate-slide-up">💡 {q.note}</p>
            )}
          </div>
        </section>
      ) : (
        <ResultsScreen score={score} total={questions.length} onPlayAgain={playAgain} onExit={onExit} />
      )}
    </div>
  );
}

function ResultsScreen({
  score,
  total,
  onPlayAgain,
  onExit,
}: {
  score: number;
  total: number;
  onPlayAgain: () => void;
  onExit: () => void;
}) {
  const tier = getTierForScore(score);
  const pct = Math.round((score / total) * 100);

  return (
    <section className="mx-auto max-w-2xl mt-10 sm:mt-16 animate-pop">
      <div className="relative rounded-3xl border border-border/70 bg-card/70 backdrop-blur p-8 sm:p-12 text-center shadow-[var(--shadow-card)] overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-x-0 -top-32 h-64 opacity-40 blur-3xl"
          style={{ background: "radial-gradient(ellipse at center, var(--ocean), transparent 70%)" }}
        />

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-accent">Final Score</p>
          <div className="mt-3 font-display text-7xl sm:text-8xl font-semibold tabular-nums">
            <span className="text-gradient-ocean">{score}</span>
            <span className="text-muted-foreground/50 text-5xl sm:text-6xl"> / {total}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{pct}% pod-fluency</p>

          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border/70 bg-background/40 px-5 py-2">
            <span className="text-2xl">{tier.emoji}</span>
            <span className="font-display text-lg font-semibold">{tier.title}</span>
          </div>

          <p className="mt-6 text-base sm:text-lg text-foreground/90 max-w-md mx-auto leading-relaxed">
            {tier.description}
          </p>

          {tier.easterEgg && (
            <div className="mt-6 rounded-2xl border border-cyan-accent/50 bg-cyan-accent/10 px-5 py-4 text-sm sm:text-base font-medium text-foreground animate-slide-up">
              {tier.easterEgg}
            </div>
          )}

          <div className="mt-10 flex flex-col sm:flex-row items-stretch justify-center gap-3">
            <button
              onClick={onPlayAgain}
              className="inline-flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-sm font-semibold text-ocean-foreground hover:brightness-110 active:scale-[0.98] transition"
              style={{ background: "var(--gradient-ocean)", boxShadow: "var(--shadow-glow)" }}
            >
              <RotateCcw className="size-4" /> Play Again
            </button>
            <button
              onClick={onExit}
              className="inline-flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-sm font-semibold border border-border/70 bg-secondary/40 hover:bg-secondary/70 transition"
            >
              <Home className="size-4" /> Back to Hub
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
