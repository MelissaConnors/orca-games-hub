export type WSDirection =
  | "E" // horizontal forward
  | "W" // horizontal backward
  | "S" // vertical forward
  | "N" // vertical backward
  | "SE" // diagonal forward down
  | "NW" // diagonal backward up
  | "NE" // diagonal forward up
  | "SW"; // diagonal backward down

export type WordSearchLevel = {
  id: number;
  title: string;
  theme: string;
  difficulty: string;
  gridSize: number;
  directions: WSDirection[];
  words: string[]; // display form; may contain underscores for spaces
};

export const WORDSEARCH_LEVELS: WordSearchLevel[] = [
  {
    id: 1,
    title: "Orca Anatomy",
    theme: "Physical body parts, markings, and physiological structures of killer whales.",
    difficulty: "Easy",
    gridSize: 10,
    directions: ["E", "S"],
    words: ["BLOWHOLE", "DORSAL", "FLUKE", "PECTORAL", "BLUBBER", "SADDLEPATCH", "ROSTRUM", "EYE_PATCH", "JAW", "MELON"],
  },
  {
    id: 2,
    title: "Orca Behavior",
    theme: "Social actions, surface displays, and communication methods.",
    difficulty: "Medium",
    gridSize: 12,
    directions: ["E", "S", "SE", "NE"],
    words: ["SPYHOP", "BREACH", "TAILSLAP", "LOGGING", "POD", "MATRIARCH", "CALLS", "CLICKS", "VOCAL", "PLAY"],
  },
  {
    id: 3,
    title: "Orca Habitat",
    theme: "Geographic regions, ocean zones, and ecosystems where orcas thrive.",
    difficulty: "Medium-Hard",
    gridSize: 14,
    directions: ["E", "W", "S", "N", "SE", "NW", "NE", "SW"],
    words: ["FJORD", "COASTAL", "ANTARCTICA", "PACIFIC", "ATLANTIC", "PUGET_SOUND", "NORWAY", "ICE_EDGE", "OCEAN", "SEA"],
  },
  {
    id: 4,
    title: "Diet & Hunting",
    theme: "Coordinated hunting tactics and primary prey species globally.",
    difficulty: "Hard",
    gridSize: 16,
    directions: ["E", "W", "S", "N", "SE", "NW", "NE", "SW"],
    words: ["SALMON", "SEAL", "HERRING", "SHARK", "STINGRAY", "PENGUIN", "STEALTH", "WAVEWASH", "CAROUSEL", "STRANDING"],
  },
  {
    id: 5,
    title: "Conservation & Threats",
    theme: "Scientific classification, ecological challenges, and human impacts facing orcas.",
    difficulty: "Expert",
    gridSize: 18,
    directions: ["E", "W", "S", "N", "SE", "NW", "NE", "SW"],
    words: ["CAPTIVITY", "POLLUTION", "OVERFISHING", "ECOTYPE", "ENDANGERED", "SOUND_NOISE", "DELPHINIDAE", "PROPELLER", "BIOACCUMULATE", "LIFESPAN"],
  },
];

export const TIMED_DIFFICULTIES = {
  easy: { label: "Easy", seconds: 15 * 60 },
  moderate: { label: "Moderate", seconds: 10 * 60 },
  difficult: { label: "Difficult", seconds: 3 * 60 },
} as const;

export type TimedDifficulty = keyof typeof TIMED_DIFFICULTIES;
