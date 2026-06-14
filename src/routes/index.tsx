import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameHub } from "@/components/orca/GameHub";
import { TriviaGame } from "@/components/orca/TriviaGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Orca Games 🐋 — A pod of playful ocean games" },
      { name: "description", content: "Dive into Orca Games: trivia, dashes, and more. Test your orca knowledge with 20 fun facts in the Orca Trivia Challenge." },
      { property: "og:title", content: "Orca Games 🐋" },
      { property: "og:description", content: "A pod of playful ocean games. Start with the Orca Trivia Challenge." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

type View = { screen: "hub" } | { screen: "game"; gameId: string };

function Index() {
  const [view, setView] = useState<View>({ screen: "hub" });

  if (view.screen === "game" && view.gameId === "trivia") {
    return <TriviaGame onExit={() => setView({ screen: "hub" })} />;
  }

  return <GameHub onPlay={(id) => setView({ screen: "game", gameId: id })} />;
}
