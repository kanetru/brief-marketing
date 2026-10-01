import type { CreativePosture, ReadingColour, ReferenceWorld } from "../types/creativeReading";

export interface PracticeProfile {
  id: string;
  /** Words that must show up in the creative copy. */
  tokens: string[];
  material: string;
  place: string;
  maker: string;
  customer: string;
  cliche: string;
  activity: string;
  nouns: string[];
  names: Record<CreativePosture, readonly string[]>;
  references: ReferenceWorld[];
  palettes: { warm: ReadingColour[]; cool: ReadingColour[] };
  risks: Record<CreativePosture, string>;
  voiceIdea: string;
  lines: string[];
}

const CERAMIC: PracticeProfile = {
  id: "ceramic",
  tokens: ["clay", "kiln", "glaze", "bowl", "firing"],
  material: "clay",
  place: "the studio bench",
  maker: "the person at the wheel",
  customer: "someone who will actually eat from the piece",
  cliche: "rustic farmhouse lifestyle branding",
  activity: "making tableware",
  nouns: ["clay", "kiln", "rim", "glaze", "firing", "bowl"],
  names: {
    editorial: ["The Kiln Journal", "Table Notes", "Clay Catalogue"],
    raw: ["Wet Clay", "The Bench", "Unfinished Rim"],
    precise: ["Measured Ware", "The Form Index", "Quiet Vessels"],
    expressive: ["Hot from the Kiln", "Loud Glaze", "The Second Shelf"],
    classic: ["The Service", "Sunday Clay", "A Useful Bowl"],
    warm: ["Everyday Clay", "The Open Studio", "Supper Ware"],
  },
  references: [
    { world: "Workshop catalogues", take: "Show the sequence of making, not a styled table." },
    { world: "Japanese tableware photography", take: "Keep the object at the scale of the hand." },
    { world: "Studio pottery diaries", take: "Let firing notes and slight irregularity stay visible." },
    { world: "Independent food magazines", take: "The meal is the context. The bowl is not a prop." },
  ],
  palettes: {
    warm: [
      { name: "Bone", hex: "#F3E6D8", possibleRole: "Background" },
      { name: "Kiln black", hex: "#241C19", possibleRole: "Primary type" },
      { name: "Clay", hex: "#8C4A32", possibleRole: "Accent" },
      { name: "Ash", hex: "#C4B2A2", possibleRole: "Supporting" },
      { name: "Oxide", hex: "#5E6B52", possibleRole: "Supporting" },
    ],
    cool: [
      { name: "Slip", hex: "#E4E7E2", possibleRole: "Background" },
      { name: "Graphite", hex: "#1C1F22", possibleRole: "Primary type" },
      { name: "Celadon", hex: "#7E9084", possibleRole: "Supporting" },
      { name: "Iron", hex: "#5C4038", possibleRole: "Accent" },
      { name: "Chalk", hex: "#F7F4EF", possibleRole: "Supporting" },
    ],
  },
  risks: {
    editorial: "This drifts into rustic lifestyle branding if the serif gets nostalgic and the photographs become styled tables.",
    raw: "This becomes a craft cliché if every image is muddy hands and the type tries to look handmade.",
    precise: "This turns cold if the vessels are lit like product shots and the clay colour leaves the palette.",
    expressive: "This becomes gift-shop loud if the glaze colour is used as a pattern rather than a material.",
    classic: "This starts to feel like a hotel breakfast service if the language gets ceremonial.",
    warm: "This flattens into generic wholesome tableware if the making disappears from the pictures.",
  },
  voiceIdea: "Speak like the person at the wheel, not a shop selling a feeling.",
  lines: [
    "The bowl is for soup, not for a shelf.",
    "We fire in small batches. The clay shows it.",
    "If you want to know how it's made, we'll show you the bench.",
    "The rim is a little uneven. That's the point of this one.",
  ],
};

const ARCHITECTURE: PracticeProfile = {
  id: "architecture",
  tokens: ["plan", "room", "drawing", "site", "house"],
  material: "drawing and material",
  place: "the site and the drawing board",
  maker: "the person who draws the room",
  customer: "a household deciding how a room will actually be used",
  cliche: "glossy property marketing and glass-tower photography",
  activity: "designing houses",
  nouns: ["plan", "section", "room", "site", "drawing", "lintel"],
  names: {
    editorial: ["The Site Journal", "Room Notes", "A Drawing Practice"],
    raw: ["Site Dust", "The Working Drawing", "Unlined"],
    precise: ["Measured Drawings", "The Plan Index", "Clear Span"],
    expressive: ["The Marked-up Plan", "Red Pencil", "Open Section"],
    classic: ["The Practice", "Quiet Plans", "A House, Drawn"],
    warm: ["Rooms People Use", "The Neighbourhood Plan", "Daylight Drawings"],
  },
  references: [
    { world: "Independent architectural magazines", take: "Publish the plan and the reasoning, not a hero exterior." },
    { world: "Council-era wayfinding", take: "Clarity, a strong accent, and no decorative friendliness." },
    { world: "Field guides", take: "Name the material and the joint. Leave the lyricism out." },
    { world: "Old working drawings", take: "Annotation, numbering, and the drawing as the main object." },
  ],
  palettes: {
    warm: [
      { name: "Tracing paper", hex: "#F4EFE4", possibleRole: "Background" },
      { name: "Ink", hex: "#1A1C1E", possibleRole: "Primary type" },
      { name: "Terracotta line", hex: "#C4654A", possibleRole: "Accent" },
      { name: "Graphite", hex: "#8A8680", possibleRole: "Supporting" },
      { name: "Oxide green", hex: "#3E5648", possibleRole: "Supporting" },
    ],
    cool: [
      { name: "Bone", hex: "#E7E2D6", possibleRole: "Background" },
      { name: "Deep ink", hex: "#15191C", possibleRole: "Primary type" },
      { name: "Safety orange", hex: "#E4572E", possibleRole: "Accent" },
      { name: "Oxidised green", hex: "#3C5648", possibleRole: "Supporting" },
      { name: "Mist", hex: "#D5DDE0", possibleRole: "Supporting" },
    ],
  },
  risks: {
    editorial: "This becomes a lifestyle interiors magazine if the drawings are replaced by styled rooms.",
    raw: "This looks unfinished rather than honest if the only images are muddy sites and the type is distressed.",
    precise: "This feels like a corporate practice if the accent disappears and the photography becomes glass towers.",
    expressive: "This turns into a student portfolio if the red pencil is the whole identity.",
    classic: "This starts to imitate a historic institution the practice is not.",
    warm: "This slides into friendly developer branding if the plans stop being visible.",
  },
  voiceIdea: "Speak like the person explaining the drawing, not a developer selling a lifestyle.",
  lines: [
    "The plan starts with how the room is actually used.",
    "We'd rather show the section than a slogan.",
    "A house can be quiet and still be exact.",
    "The material is named. The claim stays smaller than the drawing.",
  ],
};

const FURNITURE: PracticeProfile = {
  id: "furniture",
  tokens: ["timber", "joint", "bench", "piece", "workshop"],
  material: "timber",
  place: "the workshop",
  maker: "the person at the bench",
  customer: "a household furnishing one careful room",
  cliche: "showroom luxury and catalogue smiles",
  activity: "making furniture",
  nouns: ["timber", "joint", "bench", "piece", "grain", "workshop"],
  names: {
    editorial: ["The Bench Journal", "Timber Notes", "A Workshop Catalogue"],
    raw: ["Sawdust", "The Unfinished Joint", "Offcuts"],
    precise: ["The Joint Index", "Measured Furniture", "Quiet Joinery"],
    expressive: ["Big Timber", "The Marked Piece", "Workshop Type"],
    classic: ["The Cabinet", "A Good Chair", "The Workshop"],
    warm: ["Furniture for the Room", "Open Workshop", "Used Timber"],
  },
  references: [
    { world: "Old workshop catalogues", take: "Name the joint and the timber. Skip the lifestyle room." },
    { world: "Workwear labels", take: "Plain type, one sturdy colour, no romance." },
    { world: "Material studies", take: "Grain, endgrain, and the tool still in frame." },
    { world: "Independent furniture monographs", take: "One piece, properly looked at." },
  ],
  palettes: {
    warm: [
      { name: "Workshop paper", hex: "#F1E6D4", possibleRole: "Background" },
      { name: "Charred oak", hex: "#2B211C", possibleRole: "Primary type" },
      { name: "Linseed", hex: "#C47A45", possibleRole: "Accent" },
      { name: "Ash", hex: "#D7CBB8", possibleRole: "Supporting" },
      { name: "Iron", hex: "#4E5550", possibleRole: "Supporting" },
    ],
    cool: [
      { name: "Pale ash", hex: "#E7E4DC", possibleRole: "Background" },
      { name: "Ink", hex: "#1B1E22", possibleRole: "Primary type" },
      { name: "Blueprint", hex: "#3E5870", possibleRole: "Supporting" },
      { name: "Saw mark", hex: "#C45C26", possibleRole: "Accent" },
      { name: "Dust", hex: "#C8C2B6", possibleRole: "Supporting" },
    ],
  },
  risks: {
    editorial: "This becomes a furniture advert if the workshop disappears and the room is styled.",
    raw: "This is only sawdust theatre if the piece itself is never shown clearly.",
    precise: "This feels like contract furniture if the timber turns into a render.",
    expressive: "This shouts like a maker market if the type gets bigger than the work.",
    classic: "This imitates an antique dealer the workshop is not.",
    warm: "This turns wholesome and vague if the joint is never visible.",
  },
  voiceIdea: "Speak like the person at the bench, describing the piece, not a showroom.",
  lines: [
    "The joint is the part worth looking at.",
    "We make pieces for one room, not a range.",
    "The timber is named. The finish is explained.",
    "Come to the workshop before you decide.",
  ],
};

const FOOD: PracticeProfile = {
  id: "food",
  tokens: ["kitchen", "plate", "menu", "service", "table"],
  material: "food and the room",
  place: "the kitchen and the table",
  maker: "the person cooking",
  customer: "someone coming to eat, not to be impressed",
  cliche: "dark moody restaurant branding and luxury plating",
  activity: "cooking for people who sit down",
  nouns: ["kitchen", "plate", "menu", "service", "table", "pan"],
  names: {
    editorial: ["The Service Notes", "Kitchen Journal", "A Short Menu"],
    raw: ["The Pass", "Hot Pan", "Service"],
    precise: ["The Menu Index", "Set Menu", "Clear Service"],
    expressive: ["Tonight's Menu", "Loud Service", "The Special"],
    classic: ["The Dining Room", "Supper", "A Proper Menu"],
    warm: ["Come and Eat", "The Neighbourhood Table", "Open Kitchen"],
  },
  references: [
    { world: "Community newspaper food pages", take: "Say what is on the plate in plain words." },
    { world: "Old hotel menus", take: "A list, a rule, and almost no decoration." },
    { world: "Kitchen pass photography", take: "Hands, heat, and the dish leaving the pass." },
    { world: "Market signage", take: "One strong colour and the name of the thing." },
  ],
  palettes: {
    warm: [
      { name: "Menu paper", hex: "#F6EFE3", possibleRole: "Background" },
      { name: "Ink", hex: "#1C1614", possibleRole: "Primary type" },
      { name: "Tomato", hex: "#C4452D", possibleRole: "Accent" },
      { name: "Olive", hex: "#5C6848", possibleRole: "Supporting" },
      { name: "Cream", hex: "#E7D7C3", possibleRole: "Supporting" },
    ],
    cool: [
      { name: "Tile", hex: "#E6EEEA", possibleRole: "Background" },
      { name: "Ink", hex: "#172026", possibleRole: "Primary type" },
      { name: "Parsley", hex: "#2F6B4F", possibleRole: "Supporting" },
      { name: "Chilli", hex: "#D23C2A", possibleRole: "Accent" },
      { name: "Steel", hex: "#C5CED0", possibleRole: "Supporting" },
    ],
  },
  risks: {
    editorial: "This becomes a food magazine if the restaurant itself is never named in the pictures.",
    raw: "This looks chaotic rather than alive if every frame is a blur of service.",
    precise: "This feels like a chain if the menu is designed harder than the food.",
    expressive: "This turns into a specials board that never settles.",
    classic: "This imitates a grand dining room the kitchen is not.",
    warm: "This becomes generic neighbourhood cosy if the actual food leaves the frame.",
  },
  voiceIdea: "Speak like the person calling the dish, not a brand announcing an experience.",
  lines: [
    "The menu is short because the kitchen is.",
    "We'd rather tell you what's on the plate.",
    "Come hungry. The rest is on the board.",
    "Service starts when the first table sits down.",
  ],
};

const PRACTICES = [CERAMIC, ARCHITECTURE, FURNITURE, FOOD];

export function practiceFromText(blob: string, description: string): PracticeProfile {
  const found = PRACTICES.find((practice) => practice.tokens.some((token) => blob.toLowerCase().includes(token)) && matchesPractice(practice, blob));
  if (found) return found;
  return genericPractice(description);
}

function matchesPractice(practice: PracticeProfile, blob: string): boolean {
  const value = blob.toLowerCase();
  if (practice.id === "architecture") return /architect|architecture|dwelling|floor plan|site visit/.test(value);
  if (practice.id === "ceramic") return /ceramic|potter|pottery|clay|kiln|glaze|tableware/.test(value);
  if (practice.id === "furniture") return /furniture|joinery|cabinet|timber bench|workshop/.test(value);
  if (practice.id === "food") return /restaurant|kitchen|chef|menu|cook/.test(value);
  return true;
}

function genericPractice(description: string): PracticeProfile {
  const noun = distinctiveNoun(description);
  const titled = noun.charAt(0).toUpperCase() + noun.slice(1);
  return {
    id: "general",
    tokens: [noun],
    material: noun,
    place: "where the work happens",
    maker: "the person doing the work",
    customer: "the person it is actually for",
    cliche: "a category look that could belong to anyone in the trade",
    activity: description.replace(/\.$/, "") || `working with ${noun}`,
    nouns: [noun, "work", "place", "material"],
    names: {
      editorial: [`The ${titled} Journal`, `${titled} Notes`, `A ${titled} Catalogue`],
      raw: [`Working ${titled}`, `The ${titled} Bench`, `Unfinished ${titled}`],
      precise: [`Measured ${titled}`, `The ${titled} Index`, `Clear ${titled}`],
      expressive: [`Loud ${titled}`, `${titled}, Plainly`, `The ${titled} Mark`],
      classic: [`The ${titled}`, `Quiet ${titled}`, `A Serious ${titled}`],
      warm: [`Everyday ${titled}`, `Open ${titled}`, `${titled} for People`],
    },
    references: [
      { world: "Independent publishing", take: "Explain the work in sequence, with a point of view." },
      { world: "Field guides", take: "Name the specific thing. Leave the slogan out." },
      { world: "Trade catalogues", take: "Show the object and how it is made." },
      { world: "Community newspapers", take: "Plain language and a real place." },
    ],
    palettes: {
      warm: [
        { name: "Paper", hex: "#F3EEE6", possibleRole: "Background" },
        { name: "Ink", hex: "#1A1614", possibleRole: "Primary type" },
        { name: "Clay", hex: "#8C4A32", possibleRole: "Accent" },
        { name: "Stone", hex: "#C4B2A2", possibleRole: "Supporting" },
        { name: "Olive", hex: "#5E6B52", possibleRole: "Supporting" },
      ],
      cool: [
        { name: "Bone", hex: "#E7E2D6", possibleRole: "Background" },
        { name: "Ink", hex: "#15191C", possibleRole: "Primary type" },
        { name: "Signal", hex: "#E4572E", possibleRole: "Accent" },
        { name: "Slate", hex: "#4F6670", possibleRole: "Supporting" },
        { name: "Mist", hex: "#D5DDE0", possibleRole: "Supporting" },
      ],
    },
    risks: {
      editorial: `This could belong to any thoughtful ${noun} business if the actual work leaves the pictures.`,
      raw: "This becomes texture for its own sake if the thing being made is never clear.",
      precise: "This feels corporate if the accent is the only sign of life.",
      expressive: "This gets loud without getting more specific.",
      classic: "This imitates an institution the business is not.",
      warm: "This turns into generic warmth if the material is never named.",
    },
    voiceIdea: "Speak like the person doing the work, not the company selling it.",
    lines: [
      `The ${noun} is the thing worth explaining.`,
      "We'll show the work before we describe it.",
      "The useful version is the specific one.",
      "Ask us how it's made. That's the interesting part.",
    ],
  };
}

function distinctiveNoun(description: string): string {
  const stop = new Set(["small", "making", "people", "their", "with", "from", "that", "this", "work", "business", "about", "which", "where", "there", "would", "could", "being", "using"]);
  const words = description
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4 && !stop.has(word));
  return words[0] ?? "work";
}

export function stablePick<T>(items: readonly T[], seed: string): T {
  const list = items.length > 0 ? items : ([] as unknown as readonly T[]);
  const index = Math.abs(hash(seed)) % list.length;
  return list[index] as T;
}

function hash(value: string): number {
  let hashValue = 0;
  for (let index = 0; index < value.length; index += 1) hashValue = (hashValue * 31 + value.charCodeAt(index)) | 0;
  return hashValue;
}
