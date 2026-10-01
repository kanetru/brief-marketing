export type CreativePosture = "editorial" | "raw" | "precise" | "expressive" | "classic" | "warm";

export type ColourPush = "warmer" | "darker" | "cleaner" | "stranger" | "brighter" | "quieter";

export interface ReadingColour {
  name: string;
  hex: string;
  possibleRole: string;
}

export interface TypePairing {
  headingId: string;
  heading: string;
  headingFamily: string;
  bodyId: string;
  body: string;
  bodyFamily: string;
  reason: string;
}

export interface ReferenceWorld {
  world: string;
  take: string;
}

export interface ReadingVoice {
  idea: string;
  behaviours: string[];
  wordsThatBelong: string[];
  wordsThatDont: string[];
  examples: string[];
}

export interface ReadingImagePrompt {
  role: "hero" | "detail" | "context" | "texture";
  prompt: string;
}

export interface ReadingTerritory {
  archetypeId: string;
  posture: CreativePosture;
  name: string;
  idea: string;
  whyThisBusiness: string;
  borrowedWorld: string;
  distinctive: string;
  feel: string[];
  pairings: TypePairing[];
  colour: {
    name: string;
    colours: ReadingColour[];
    why: string;
    contrast: string;
    accent: string;
  };
  imageNotes: string[];
  layout: string[];
  graphicLanguage: string[];
  voice: ReadingVoice;
  mustNotBecome: string;
  risk: string;
  references: ReferenceWorld[];
  imagePrompts: ReadingImagePrompt[];
  sharedArtDirection: string;
}

export interface BrandHypothesis {
  centralIdea: string;
  strategicOpportunity: string;
  desiredFeeling: string;
  culturalTerritory: string;
  visualOpportunity: string;
  verbalOpportunity: string;
  tensionsToUse: string[];
  conventionsToAvoid: string[];
  evidence: string[];
}

export interface TomorrowBrief {
  type: string;
  colour: string;
  photography: string[];
  design: string[];
  voice: string[];
  avoid: string[];
  questions: string[];
}

export interface CreativeReading {
  source: "strategist" | "fallback";
  hypothesis: BrandHypothesis;
  territories: ReadingTerritory[];
  tomorrow: TomorrowBrief;
}

export interface StrategistState {
  status: "idle" | "running" | "ready" | "failed";
  evidenceHash: string | null;
  reading: CreativeReading | null;
  failureCode: string | null;
}
