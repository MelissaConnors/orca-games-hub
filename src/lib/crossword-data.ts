export type CrosswordWord = {
  word: string;
  clue: string;
  preferred?: "across" | "down";
};

export type CrosswordLevel = {
  id: number;
  title: string;
  subtitle: string;
  difficulty: "Easy" | "Medium" | "Medium-Hard" | "Hard" | "Expert";
  gridSize: number;
  words: CrosswordWord[];
};

export const CROSSWORD_LEVELS: CrosswordLevel[] = [
  {
    id: 1,
    title: "Orca Basics",
    subtitle: "Get your fins wet with the fundamentals.",
    difficulty: "Easy",
    gridSize: 15,
    words: [
      { word: "ORCA", clue: "The scientific and common generic name for a killer whale.", preferred: "across" },
      { word: "POD", clue: "A tightly-knit social group or family of orcas.", preferred: "down" },
      { word: "WHALE", clue: "Though actually dolphins, orcas belong to this broader mammalian order.", preferred: "across" },
      { word: "DOLPHIN", clue: "The specific marine mammal family (Delphinidae) that orcas actually belong to.", preferred: "down" },
      { word: "OCEAN", clue: "The vast body of saltwater where all orcas reside.", preferred: "across" },
      { word: "CALF", clue: "A baby or newborn orca.", preferred: "down" },
      { word: "BULL", clue: "An adult male orca, known for having a very tall dorsal fin.", preferred: "across" },
      { word: "COW", clue: "An adult female orca.", preferred: "down" },
      { word: "BLACK", clue: "The dominant color of an orca's back and sides.", preferred: "across" },
      { word: "WHITE", clue: "The color of an orca's belly and distinctive eye patches.", preferred: "down" },
      { word: "SADDLE", clue: "The grey patch of coloring located just behind an orca's dorsal fin.", preferred: "across" },
      { word: "BLOWHOLE", clue: "The muscular hole on top of the head used for breathing air.", preferred: "down" },
      { word: "FIN", clue: "The prominent appendage on an orca's back that sticks out of the water.", preferred: "across" },
      { word: "TAIL", clue: "The rear part of the orca used to propel it through the water.", preferred: "down" },
      { word: "SEA", clue: "A large body of saltwater, smaller than an ocean, inhabited by orcas.", preferred: "across" },
    ],
  },
  {
    id: 2,
    title: "Social Structure & Behavior",
    subtitle: "How the pod talks, plays, and leads.",
    difficulty: "Medium",
    gridSize: 18,
    words: [
      { word: "MATRIARCH", clue: "The eldest female who leads and directs an orca pod.", preferred: "across" },
      { word: "SPYHOP", clue: "When an orca pokes its head straight up out of the water to look around.", preferred: "down" },
      { word: "BREACH", clue: "The spectacular act of an orca launching its entire body out of the water.", preferred: "across" },
      { word: "DIALECT", clue: "A unique set of calls and clicks specific to a single orca pod.", preferred: "down" },
      { word: "ECHO", clue: "The sound bounce used during echolocation to map surroundings.", preferred: "across" },
      { word: "SONAR", clue: "Biological system used by orcas to navigate and find food via sound waves.", preferred: "down" },
      { word: "PLAY", clue: "Social behavior involving splashing, chasing, or rolling over one another.", preferred: "across" },
      { word: "GREETING", clue: "A rare ritual where two pods form face-to-face lines before mingling.", preferred: "down" },
      { word: "VOCAL", clue: "The sound-based communication orcas are famous for.", preferred: "across" },
      { word: "TAILSLAP", clue: "Slapping the water surface forcefully with the flukes to communicate or stun.", preferred: "down" },
      { word: "LOGGING", clue: "Floating restfully and motionlessly at the surface like a piece of wood.", preferred: "across" },
      { word: "SUPERPOD", clue: "A massive, temporary gathering of multiple pods for socializing or mating.", preferred: "down" },
      { word: "CLICKS", clue: "Rapid sound pulses used specifically for echolocation navigation.", preferred: "across" },
      { word: "WHISTLES", clue: "Continuous, high-pitched sounds used for close-range social communication.", preferred: "down" },
      { word: "ANXIETY", clue: "Emotional stress shown by orcas when separated from their family units.", preferred: "across" },
    ],
  },
  {
    id: 3,
    title: "Habitats & Global Families",
    subtitle: "Mapping the ecotypes of the world's seas.",
    difficulty: "Medium-Hard",
    gridSize: 20,
    words: [
      { word: "RESIDENT", clue: "Orcas that stay near coastlines and eat fish, primarily salmon.", preferred: "across" },
      { word: "TRANSIENT", clue: "Mammal-eating orcas that roam widely in small, quiet groups (also called Bigg's).", preferred: "down" },
      { word: "OFFSHORE", clue: "Rare orcas that live far out at sea and heavily target sharks.", preferred: "across" },
      { word: "ECOTYPE", clue: "A distinct regional form of orca with unique genetics, diet, and appearance.", preferred: "down" },
      { word: "ANTARCTICA", clue: "The icy southern continent home to Type A, B, C, and D ecotypes.", preferred: "across" },
      { word: "PACIFIC", clue: "The ocean home to the famous Southern Resident orca population.", preferred: "down" },
      { word: "ATLANTIC", clue: "Ocean home to Type 1 and Type 2 orcas, often seen near Norway or Iceland.", preferred: "across" },
      { word: "MIGRATION", clue: "Traveling long distances, often following food sources or ice melting cycles.", preferred: "down" },
      { word: "NORWAY", clue: "European country famous for orcas overwintering in its fjords to hunt herring.", preferred: "across" },
      { word: "PUGET", clue: "The specific sound in Washington state critical to Resident orca habitats.", preferred: "down" },
      { word: "COASTAL", clue: "Near-shore waters preferred by Resident orca ecotypes.", preferred: "across" },
      { word: "ICEEDGE", clue: "The physical hunting boundary where Type B orcas search for seals.", preferred: "down" },
      { word: "TROPICS", clue: "Warm equatorial waters where orcas are rarely but occasionally sighted.", preferred: "across" },
      { word: "CHILE", clue: "South American country where orcas are known to hunt sea lion colonies along beaches.", preferred: "down" },
      { word: "FJORD", clue: "Deep, narrow inlets of sea between cliffs where orcas frequently hunt fish.", preferred: "across" },
    ],
  },
  {
    id: 4,
    title: "Diet & Hunting Strategies",
    subtitle: "Apex tactics from the world's smartest predators.",
    difficulty: "Hard",
    gridSize: 20,
    words: [
      { word: "SALMON", clue: "The absolute favorite fish choice of Southern Resident orcas.", preferred: "across" },
      { word: "SEAL", clue: "A common pinniped targeted by Transient orcas using stealth.", preferred: "down" },
      { word: "HERRING", clue: "Small schooling fish targeted in mass numbers by Norwegian orcas.", preferred: "across" },
      { word: "CAROUSEL", clue: "The hunting method where orcas herd fish into a tight ball and stun them with tails.", preferred: "down" },
      { word: "WAVEWASH", clue: "Highly coordinated strategy where orcas knock seals off ice floes.", preferred: "across" },
      { word: "SHARK", clue: "Large marine predator targeted by offshore orcas for their fatty livers.", preferred: "down" },
      { word: "STINGRAY", clue: "Bottom-dwelling creature that New Zealand orcas skillfully pull from the mud.", preferred: "across" },
      { word: "STRANDING", clue: "Intentional beaching technique used by orcas to grab sea lions from the shore.", preferred: "down" },
      { word: "PENGUIN", clue: "Flightless polar bird targeted by certain Antarctic orcas.", preferred: "across" },
      { word: "APEX", clue: "The status of orcas as predators at the absolute top of the food chain with no natural enemies.", preferred: "down" },
      { word: "STEALTH", clue: "Complete silence used by mammal-eating orcas to avoid detection by smart prey.", preferred: "across" },
      { word: "PACK", clue: "The coordinated, wolf-like grouping method orcas use to take down massive baleen whales.", preferred: "down" },
      { word: "FLUKES", clue: "The horizontal tail lobes used to deliver powerful, prey-stunning slaps.", preferred: "across" },
      { word: "STUN", clue: "To immobilize or disorient prey using a physical tail strike or sound.", preferred: "down" },
      { word: "COOPERATION", clue: "The teamwork required for orcas to pull off complex hunting maneuvers.", preferred: "across" },
    ],
  },
  {
    id: 5,
    title: "Anatomy, Biology & Conservation",
    subtitle: "The biology behind the legend — and the fight to protect it.",
    difficulty: "Expert",
    gridSize: 22,
    words: [
      { word: "DELPHINIDAE", clue: "The official scientific family classification for all ocean dolphins.", preferred: "across" },
      { word: "BLUBBER", clue: "The thick layer of fat providing insulation, energy, and buoyancy.", preferred: "down" },
      { word: "ECTOTHERM", clue: "Misconception check: Orcas are NOT this; they are warm-blooded endotherms.", preferred: "across" },
      { word: "CAPTIVITY", clue: "The highly controversial practice of keeping orcas in concrete tanks for entertainment.", preferred: "down" },
      { word: "POLLUTION", clue: "Toxic chemical runoff that bioaccumulates dangerously inside orca fat.", preferred: "across" },
      { word: "MELANIN", clue: "The natural skin pigment responsible for the striking black coloration of the orca.", preferred: "down" },
      { word: "DORSAL", clue: "The top fin that can grow up to six feet tall in mature males.", preferred: "across" },
      { word: "PECTORAL", clue: "The large, paddle-shaped side flippers used by orcas for steering.", preferred: "down" },
      { word: "PROPELLER", clue: "Part of a boat or ship that poses a severe physical strike injury risk to orcas.", preferred: "across" },
      { word: "SOUND", clue: "Marine noise disruption from ships that interferes with orca echolocation.", preferred: "down" },
      { word: "ENDANGERED", clue: "The official conservation status of the Southern Resident orca population.", preferred: "across" },
      { word: "BIOACCUMULATE", clue: "The process where toxins build up in higher concentrations at the top of the food chain.", preferred: "down" },
      { word: "OVERFISHING", clue: "Human threat that starves fish-eating orcas of their primary food supply.", preferred: "across" },
      { word: "COLLAPSE", clue: "The physical bending over of the dorsal fin frequently seen in captive orcas.", preferred: "down" },
      { word: "LIFESPAN", clue: "The maximum age of an orca, which can reach up to eighty or ninety years for females.", preferred: "across" },
    ],
  },
];
