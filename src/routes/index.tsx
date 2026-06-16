import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameHub } from "@/components/orca/GameHub";
import { TriviaGame } from "@/components/orca/TriviaGame";
import { JigsawGame } from "@/components/orca/JigsawGame";
import { CrosswordGame } from "@/components/orca/CrosswordGame";
import { WordSearchGame } from "@/components/orca/WordSearchGame";
import { OrcaDashGame } from "@/components/orca/OrcaDashGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Orca Games 🐋 — A pod of playful ocean games" },
      { name: "description", content: "Dive into Orca Games: trivia, jigsaw, and more. Test your orca knowledge or piece together the arctic pod." },
      { property: "og:title", content: "Orca Games 🐋" },
      { property: "og:description", content: "A pod of playful ocean games. Trivia, jigsaw puzzles, and more." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

type View = { screen: "hub" } | { screen: "game"; gameId: string };

function Index() {
  const [view, setView] = useState<View>({ screen: "hub" });
  const back = () => setView({ screen: "hub" });

  if (view.screen === "game") {
    if (view.gameId === "trivia") return <TriviaGame onExit={back} />;
    if (view.gameId === "jigsaw") return <JigsawGame onExit={back} />;
    if (view.gameId === "crossword") return <CrosswordGame onExit={back} />;
    if (view.gameId === "wordsearch") return <WordSearchGame onExit={back} />;
  }

  return <GameHub onPlay={(id) => setView({ screen: "game", gameId: id })} />;
}
