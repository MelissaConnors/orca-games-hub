export type TriviaQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  note?: string;
};

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    question: "Orcas are the largest species of what animal family?",
    options: ["Dolphin", "Whale", "Shark", "Porpoise"],
    correctIndex: 0,
  },
  {
    question: "True or False: Orcas are found in every single ocean in the world.",
    options: ["True", "False"],
    correctIndex: 0,
  },
  {
    question: "What is a group of orcas living together called?",
    options: ["Pack", "Pod", "School", "Herd"],
    correctIndex: 1,
  },
  {
    question: 'True or False: Every orca pod speaks the exact same "language" of clicks and whistles.',
    options: ["True", "False"],
    correctIndex: 1,
    note: "Pods have unique dialects!",
  },
  {
    question: "What is the distinct white patch behind an orca's eye called?",
    options: ["Eye patch", "Post-ocular patch", "Saddle patch", "False eye"],
    correctIndex: 1,
  },
  {
    question: "True or False: Wild orcas have never been documented killing a human in the wild.",
    options: ["True", "False"],
    correctIndex: 0,
  },
  {
    question: "What is the gray/white area on an orca's back right behind its dorsal fin called?",
    options: ["Backpack", "Dorsal cape", "Saddle patch", "Fin shadow"],
    correctIndex: 2,
  },
  {
    question: "How do orcas sleep?",
    options: [
      "At the bottom of the ocean floor",
      "With one eye open and half their brain awake",
      "Floating completely upside down",
      "They don't sleep",
    ],
    correctIndex: 1,
  },
  {
    question: "True or False: Orcas are apex predators, meaning nothing eats them.",
    options: ["True", "False"],
    correctIndex: 0,
  },
  {
    question: "What is an adult male orca's dorsal fin height capable of reaching?",
    options: ["2 feet", "4 feet", "6 feet", "10 feet"],
    correctIndex: 2,
  },
  {
    question: 'True or False: Orcas use echolocation to "see" in dark or murky water.',
    options: ["True", "False"],
    correctIndex: 0,
  },
  {
    question: "Which of these foods is NOT part of any orca population's diet?",
    options: ["Great White Sharks", "Moose", "Penguins", "Giant Squid"],
    correctIndex: 3,
  },
  {
    question: "True or False: Female orcas have a much shorter lifespan than male orcas.",
    options: ["True", "False"],
    correctIndex: 1,
    note: "Females can live up to 90 years, males usually up to 60.",
  },
  {
    question: "When an orca leaps completely out of the water, what is this behavior called?",
    options: ["Breaching", "Skyhopping", "Spyhopping", "Podding"],
    correctIndex: 0,
  },
  {
    question: "When an orca pokes its head straight up out of the water to look around, what is it doing?",
    options: ["Breaching", "Spyhopping", "Lobtailing", "Sunbathing"],
    correctIndex: 1,
  },
  {
    question: "True or False: Resident orcas and Transient (Bigg's) orcas frequently hang out and interbreed.",
    options: ["True", "False"],
    correctIndex: 1,
    note: "They actively avoid each other!",
  },
  {
    question: "How do orcas primarily cool down or release body heat?",
    options: [
      "Through their blowhole",
      "Through their flippers and tail flukes",
      "By opening their mouths wide",
      "By diving to the deepest ocean trenches",
    ],
    correctIndex: 1,
  },
  {
    question: "True or False: Orcas are more closely related to hippos than they are to sharks.",
    options: ["True", "False"],
    correctIndex: 0,
    note: "Cetaceans share an evolutionary ancestor with hippos.",
  },
  {
    question: "What color are newborn orca calves' white patches typically?",
    options: ["Bright pink", "Yellowish or peachy-orange", "Jet black", "Pure white"],
    correctIndex: 1,
  },
  {
    question: "Orcas belong to the suborder Odontoceti, which means what?",
    options: ["Toothed whales", "Baleen whales", "Ocean monsters", "Fast swimmers"],
    correctIndex: 0,
  },
];

export type ScoreTier = {
  min: number;
  max: number;
  emoji: string;
  title: string;
  description: string;
  easterEgg?: string;
};

export const SCORE_TIERS: ScoreTier[] = [
  {
    min: 20,
    max: 20,
    emoji: "👑",
    title: "True Orca",
    description: "A perfect score. The pod bows before you.",
    easterEgg: "Wait... are you actually an orca typing on a keyboard right now? 🐋👁️",
  },
  {
    min: 16,
    max: 19,
    emoji: "🫍",
    title: "Orca Enthusiast",
    description: "Incredible! You practically speak fluent 'Clicks and Whistles'.",
  },
  {
    min: 11,
    max: 15,
    emoji: "🌊",
    title: "Orca Friend",
    description: "Great job! The pod accepts you as an honorary member.",
  },
  {
    min: 6,
    max: 10,
    emoji: "💧",
    title: "Orca Novice",
    description: "Not bad, but you're still swimming in the shallow end.",
  },
  {
    min: 0,
    max: 5,
    emoji: "🙃",
    title: "Orca Challenged",
    description: "Oh no! Did a seal distract you? Time to dive back in and study up!",
  },
];

export function getTierForScore(score: number): ScoreTier {
  return SCORE_TIERS.find((t) => score >= t.min && score <= t.max) ?? SCORE_TIERS[SCORE_TIERS.length - 1];
}
