import { Sparkles, Lock } from "lucide-react";
import or BEAVER from "@/assets/orca-mascot.png";

type Game = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  status: "active" | "coming-soon";
};

const GAMES: Game[] = [
  {
    id: "trivia",
    title: "Orca Trivia Challenge",
    emoji: "🐋",
    description: "20 questions of cetacean cunning. Prove you belong in the pod.",
    status: "active",
  },
  {
    id: "dash",
    title: "Orca Dash",
    emoji: "🌊",
    description: "Race through reefs, dodge boats, breach for combo points.",
    status: "coming-soon",
  },
  {
    id: "pod",
    title: "Pod Matcher",
    emoji: "🐬",
    description: "Match dorsal fins and saddle patches to reunite the pod.",
    status: "coming-soon",
  },
];

export function GameHub({ onPlay }: { onPlay: (id: string) => void }) {
  return (
    <div className="min-h-screen px-4 sm:px-8 pb-24">
      <header className="mx-auto max-w-6xl pt-10 sm:pt-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl sm:text-4xl animate-float-slow inline-block">🐋</span>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Orca Games</h1>
            <p className="text-xs sm:text-sm text-muted-foreground -mt-0.5">A pod of playful ocean games</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground rounded-full border border-border/60 px-3 py-1.5 bg-card/40 backdrop-blur">
          <Sparkles className="size-3.5 text-cyan-accent" /> New games surfacing soon
        </div>
      </header>

      <section className="mx-auto max-w-6xl mt-16 sm:mt-24 text-center animate-slide-up">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-accent/90 mb-4">
          <span className="size-1.5 rounded-full bg-cyan-accent animate-pulse" /> Pod-approved fun
        </p>
        <h2 className="font-display text-4xl sm:text-6xl font-semibold leading-[1.05] tracking-tight max-w-3xl mx-auto">
          Dive into a world of <span className="text-gradient-ocean">orca-powered</span> games.
        </h2>
        <p className="mt-5 text-muted-foreground max-w-xl mx-auto text-base sm:text-lg">
          Test your trivia, race the tide, match the pod. Pick a game to begin your deep dive.
        </p>
      </section>

      <section className="mx-auto max-w-6xl mt-14 sm:mt-20 grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g, i) => (
          <GameCard key={g.id} game={g} index={i} onPlay={onPlay} />
        ))}
      </section>

      <footer className="mx-auto max-w-6xl mt-24 text-center text-xs text-muted-foreground">
        Built with whale-sized love. No actual orcas were quizzed in the making of this hub.
      </footer>
    </div>
  );
}

function GameCard({ game, index, onPlay }: { game: Game; index: number; onPlay: (id: string) => void }) {
  const locked = game.status === "coming-soon";
  return (
    <div
      className="animate-slide-up"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div
        className={[
          "group relative h-full rounded-3xl border bg-card/60 backdrop-blur p-6 sm:p-7 overflow-hidden transition-all duration-300",
          locked
            ? "border-border/50 opacity-70"
            : "border-border/70 hover:border-cyan-accent/50 hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]",
        ].join(" ")}
      >
        {!locked && (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: "radial-gradient(circle, var(--cyan-accent) 0%, transparent 65%)" }}
          />
        )}

        <div className="relative flex items-start justify-between">
          <div
            className={[
              "grid place-items-center size-16 rounded-2xl text-4xl",
              locked
                ? "bg-muted/40 grayscale"
                : "bg-gradient-to-br from-ocean/30 to-cyan-accent/20 group-hover:animate-float",
            ].join(" ")}
          >
            <span>{game.emoji}</span>
          </div>
          {locked ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full">
              <Lock className="size-3" /> Coming Soon
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-success bg-success/15 px-2.5 py-1 rounded-full">
              <span className="size-1.5 rounded-full bg-success" /> Live
            </span>
          )}
        </div>

        <h3 className="relative font-display text-2xl font-semibold mt-6 tracking-tight">{game.title}</h3>
        <p className="relative text-sm text-muted-foreground mt-2 leading-relaxed min-h-[3rem]">{game.description}</p>

        <div className="relative mt-7">
          {locked ? (
            <button
              disabled
              className="w-full rounded-xl border border-border/60 bg-muted/30 text-muted-foreground py-3 text-sm font-medium cursor-not-allowed"
            >
              Surfacing soon
            </button>
          ) : (
            <button
              onClick={() => onPlay(game.id)}
              className="w-full rounded-xl py-3 text-sm font-semibold text-ocean-foreground transition-transform active:scale-[0.98] hover:brightness-110"
              style={{ background: "var(--gradient-ocean)", boxShadow: "var(--shadow-glow)" }}
            >
              Play Now →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
