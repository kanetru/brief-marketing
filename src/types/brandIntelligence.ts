/** Derived creative intelligence. Never written back into the client's raw answers. */

export type SignalGroup = "semantic" | "visual" | "verbal";

export type SignalStrength = "strong" | "moderate" | "exploratory" | "mixed";

export interface SignalEvidenceNote {
  source: string;
  summary: string;
}

export interface BrandSignal {
  dimension: string;
  group: SignalGroup;
  /** Positive means the evidence leans toward this dimension. */
  polarity: "positive" | "negative";
  strength: SignalStrength;
  /** Internal only. Client-facing copy uses `strength`. */
  net: number;
  evidenceCount: number;
  evidenceSources: string[];
  supportingEvidence: string[];
  conflictingEvidence: string[];
}

export interface AvoidItem {
  kind: "hard" | "soft";
  label: string;
  dimension: string | null;
  source: string;
  summary: string;
}

export interface SignalTension {
  left: string;
  right: string;
  statement: string;
}

export interface CrossModalReinforcement {
  dimension: string;
  modalities: string[];
  summary: string;
}

export interface SignalContribution {
  dimension: string;
  amount: number;
  modality: string;
  kind: string;
  source: string;
  summary: string;
}

export interface BrandSignalModel {
  signals: BrandSignal[];
  nets: Record<string, number>;
  hardAvoids: AvoidItem[];
  softAvoids: AvoidItem[];
  tensions: SignalTension[];
  reinforcement: CrossModalReinforcement[];
  uncertainty: string[];
  contributions: SignalContribution[];
  hardAvoidDimensions: string[];
}

export interface TypefaceCandidate {
  id: string;
  name: string;
  source: string;
  license: string;
  fontFamily: string;
  why: string[];
  evidenceSources: string[];
}

export interface ColourTerritory {
  id: string;
  name: string;
  role: "suggested" | "alternative" | "existing";
  swatches: string[];
  rationale: string;
  evidenceSources: string[];
}

export interface ImageryDirection {
  summary: string;
  notes: string[];
  avoid: string[];
  evidenceSources: string[];
}

export interface VoiceDirection {
  cluster: string;
  summary: string;
  characteristics: string[];
  behaviour: string[];
  examplePhrases: string[];
  wordsToExplore: string[];
  wordsToAvoid: string[];
  evidenceSources: string[];
}

export type ExplorationLevel = "exploratory" | "supported";

export interface CreativeTerritory {
  id: string;
  name: string;
  oneLineIdea: string;
  rationale: string;
  personality: string[];
  visualCharacter: string[];
  colourDirection: ColourTerritory;
  alternativeColour: ColourTerritory | null;
  existingColours: ColourTerritory | null;
  typeDirection: {
    summary: string;
    candidates: TypefaceCandidate[];
  };
  imageryDirection: ImageryDirection;
  voiceDirection: VoiceDirection;
  stylingNotes: string[];
  possibleReferences: string[];
  examplePhrases: string[];
  supportingEvidence: SignalEvidenceNote[];
  tensionsResolved: string[];
  tensionsPreserved: string[];
  hardAvoidsRespected: string[];
  explorationLevel: ExplorationLevel;
  previewDirectionId: string;
  /** Reserved for a later moodboard pass. Empty in this version. */
  generatedMoodboardAssets: string[];
  generatedImagePrompts: string[];
  referenceImages: string[];
}

export interface WorkingBrief {
  headline: string;
  feel: string;
  colour: string;
  type: string;
  imagery: string;
  voice: string;
  avoid: string;
  stillOpen: string;
}

export interface BrandIntelligence {
  /** Signal model before territory reactions. */
  draftModel: BrandSignalModel;
  /** Signal model including territory reactions, when any exist. */
  model: BrandSignalModel;
  draftTerritories: CreativeTerritory[];
  territories: CreativeTerritory[];
  /** The one creative fork worth asking, if the draft model is split. */
  forkQuestion: string | null;
  weightingNotes: string;
  workingBrief: WorkingBrief;
  firstConversation: string[];
}
