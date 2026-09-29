import { archetypeById } from "./archetypes";
import { paletteById } from "./palettes";
import { SIGNAL_WEIGHTS } from "./signalWeights";
import { typeDirectionById } from "./typography";
import type { DiscoverySession, PersonalityTrait, SpectrumDimensionId } from "../types/discovery";
import type {
  AvoidItem,
  BrandSignal,
  BrandSignalModel,
  CrossModalReinforcement,
  SignalContribution,
  SignalGroup,
  SignalStrength,
  SignalTension,
} from "../types/brandIntelligence";

const CREATIVE_FORK_ID = "creative-fork";

const GROUP_OF: Record<string, SignalGroup> = {
  personality: "semantic",
  spectrum: "semantic",
  inspiration: "semantic",
  clarification: "semantic",
  reaction: "semantic",
  visual: "visual",
  colour: "visual",
  typography: "visual",
  imagery: "visual",
  voice: "verbal",
};

const VOICE_DIMENSIONS = new Set([
  "conversational",
  "formal",
  "direct",
  "reserved",
  "simple",
  "confident",
  "humble",
  "promotional",
  "understated",
]);

const SEMANTIC_DIMENSIONS = new Set([
  "human",
  "authoritative",
  "approachable",
  "rebellious",
  "dependable",
  "energetic",
  "calm",
  "premium",
  "accessible",
  "technical",
  "practical",
  "refined",
  "natural",
  "progressive",
  "traditional",
]);

const PERSONALITY_MAP: Record<PersonalityTrait, Array<[string, number]>> = {
  warm: [["warm", 1], ["approachable", 0.55], ["human", 0.35]],
  knowledgeable: [["confident", 0.55], ["practical", 0.4]],
  bold: [["expressive", 1], ["energetic", 0.45]],
  playful: [["playful", 1], ["energetic", 0.35]],
  natural: [["natural", 1], ["organic", 0.85], ["tactile", 0.4]],
  refined: [["refined", 1], ["polished", 0.55], ["editorial", 0.3]],
  rebellious: [["rebellious", 1], ["expressive", 0.35]],
  technical: [["technical", 1], ["utilitarian", 0.45], ["geometric", 0.4]],
  traditional: [["traditional", 1], ["classic", 0.7]],
  progressive: [["progressive", 1], ["contemporary", 0.5]],
  dependable: [["dependable", 1], ["calm", 0.3]],
  energetic: [["energetic", 1], ["expressive", 0.35]],
  calm: [["calm", 1], ["restrained", 0.6]],
  premium: [["premium", 1], ["polished", 0.5]],
  accessible: [["accessible", 1], ["approachable", 0.55], ["human", 0.3]],
  creative: [["expressive", 0.65], ["progressive", 0.4]],
  practical: [["practical", 1], ["utilitarian", 0.5]],
  human: [["human", 1], ["approachable", 0.45], ["warm", 0.3]],
};

const SPECTRUM_POLES: Record<SpectrumDimensionId, readonly [string, string]> = {
  playful_serious: ["playful", "serious"],
  traditional_progressive: ["traditional", "progressive"],
  understated_bold: ["restrained", "expressive"],
  raw_polished: ["raw", "polished"],
  familiar_exclusive: ["accessible", "premium"],
  human_corporate: ["human", "authoritative"],
};

const PALETTE_SIGNALS: Record<string, Array<[string, number]>> = {
  "warm-earth": [["warm", 1], ["organic", 0.8], ["natural", 0.6], ["tactile", 0.4]],
  "quiet-neutral": [["restrained", 0.8], ["clean", 0.55], ["classic", 0.3]],
  "high-contrast": [["expressive", 0.8], ["contemporary", 0.45]],
  "sun-washed": [["warm", 0.8], ["playful", 0.45], ["energetic", 0.35]],
  "deep-botanical": [["natural", 0.9], ["organic", 0.7], ["calm", 0.4]],
  "soft-editorial": [["editorial", 0.9], ["warm", 0.5], ["restrained", 0.5]],
  "bright-optimistic": [["playful", 0.8], ["energetic", 0.65], ["expressive", 0.45]],
  "cool-structured": [["cool", 0.9], ["geometric", 0.75], ["technical", 0.5], ["clean", 0.4]],
};

const TYPE_SIGNALS: Record<string, Array<[string, number]>> = {
  editorial_serif: [["editorial", 0.9], ["warm", 0.45], ["expressive", 0.35], ["classic", 0.3]],
  clean_sans: [["clean", 0.9], ["contemporary", 0.55], ["minimal", 0.45], ["geometric", 0.4]],
  humanist_sans: [["human", 0.7], ["approachable", 0.6], ["warm", 0.35]],
  bold_grotesk: [["expressive", 0.9], ["contemporary", 0.55], ["geometric", 0.5]],
  classic_serif: [["classic", 0.9], ["traditional", 0.55], ["formal", 0.45], ["polished", 0.35]],
  expressive_display: [["expressive", 0.9], ["playful", 0.5], ["contemporary", 0.55]],
};

const IMAGERY_SIGNALS: Record<string, Array<[string, number]>> = {
  documentary: [["raw", 0.65], ["human", 0.7], ["organic", 0.5], ["warm", 0.35]],
  polished: [["polished", 0.9], ["clean", 0.45]],
  editorial: [["editorial", 0.9], ["restrained", 0.4]],
  people_first: [["human", 0.9], ["approachable", 0.5]],
  detail_craft: [["tactile", 0.9], ["organic", 0.5]],
  atmospheric: [["layered", 0.7], ["expressive", 0.4], ["restrained", 0.25]],
};

const VISUAL_TRAIT_MAP: Record<string, Array<[string, number]>> = {
  editorial: [["editorial", 1]],
  organic: [["organic", 1], ["tactile", 0.3]],
  minimal: [["minimal", 1], ["clean", 0.35]],
  expressive: [["expressive", 1]],
  playful: [["playful", 1]],
  technical: [["geometric", 0.85], ["technical", 0.65], ["utilitarian", 0.35]],
  warm: [["warm", 1]],
  cool: [["cool", 1]],
  polished: [["polished", 1], ["clean", 0.25]],
  raw: [["raw", 1], ["tactile", 0.35]],
  bold: [["expressive", 0.65]],
  restrained: [["restrained", 1]],
  classic: [["classic", 1]],
  contemporary: [["contemporary", 1]],
};

const NOTE_PATTERNS: Array<{ pattern: RegExp; dimensions: Array<[string, number]> }> = [
  { pattern: /\bhandmade\b|\bimperfect\b|\bcrafted\b|\btexture\b/i, dimensions: [["tactile", 1], ["organic", 0.8], ["raw", 0.45]] },
  { pattern: /\bnatural\b|\borganic\b/i, dimensions: [["natural", 0.8], ["organic", 0.8]] },
  { pattern: /\bwarm\b|\bhuman\b/i, dimensions: [["warm", 0.55], ["human", 0.7]] },
  { pattern: /\beditorial\b|\bmagazine\b/i, dimensions: [["editorial", 0.8]] },
  { pattern: /\btech startup\b|\bcorporate\b|\bglossy\b/i, dimensions: [["polished", 0.7], ["technical", 0.45], ["geometric", 0.4]] },
  { pattern: /\bplayful\b|\bfun\b/i, dimensions: [["playful", 0.8]] },
  { pattern: /\bquiet\b|\bunderstated\b/i, dimensions: [["restrained", 0.65], ["understated", 0.6]] },
  { pattern: /\bbold\b/i, dimensions: [["expressive", 0.55]] },
];

const TENSION_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["raw", "polished"],
  ["organic", "geometric"],
  ["expressive", "restrained"],
  ["playful", "serious"],
  ["warm", "cool"],
  ["human", "authoritative"],
  ["conversational", "formal"],
];

interface Bucket {
  positive: number;
  negative: number;
  explicitNegative: boolean;
  evidenceCount: number;
  sources: Map<string, { summary: string; amount: number }>;
  groups: Record<SignalGroup, number>;
  modalities: Map<string, number>;
}

function emptyBucket(): Bucket {
  return {
    positive: 0,
    negative: 0,
    explicitNegative: false,
    evidenceCount: 0,
    sources: new Map(),
    groups: { semantic: 0, visual: 0, verbal: 0 },
    modalities: new Map(),
  };
}

function textOf(value: { state: string; evidence?: { raw: string } } | undefined): string {
  if (!value || value.state !== "evidence" || !value.evidence) return "";
  return value.evidence.raw.trim();
}

export function strengthLabel(strength: SignalStrength): string {
  if (strength === "strong") return "Strong signal";
  if (strength === "moderate") return "Moderate signal";
  if (strength === "mixed") return "Mixed";
  return "Exploratory signal";
}

export function buildBrandSignalModel(
  session: DiscoverySession,
  options: { includeReaction?: boolean } = {},
): BrandSignalModel {
  const contributions: SignalContribution[] = [];
  const buckets = new Map<string, Bucket>();

  function add(
    dimension: string,
    amount: number,
    modality: string,
    kind: string,
    source: string,
    summary: string,
  ) {
    if (!dimension || amount === 0) return;
    const bucket = buckets.get(dimension) ?? emptyBucket();
    if (amount > 0) {
      bucket.positive += amount;
      bucket.modalities.set(modality, (bucket.modalities.get(modality) ?? 0) + amount);
    } else {
      bucket.negative += -amount;
      if (kind === "explicit_rejection") bucket.explicitNegative = true;
    }
    bucket.evidenceCount += 1;
    const group = GROUP_OF[modality] ?? "semantic";
    bucket.groups[group] += amount;
    const existing = bucket.sources.get(source);
    if (!existing || Math.abs(amount) > Math.abs(existing.amount)) {
      bucket.sources.set(source, { summary, amount });
    }
    buckets.set(dimension, bucket);
    contributions.push({ dimension, amount, modality, kind, source, summary });
  }

  function addMapped(
    pairs: Array<[string, number]>,
    weight: number,
    modality: string,
    kind: string,
    source: string,
    summary: string,
    sign = 1,
  ) {
    for (const [dimension, factor] of pairs) {
      add(dimension, sign * weight * factor, modality, kind, source, summary);
    }
  }

  for (const trait of session.personality.attract.selected) {
    addMapped(
      PERSONALITY_MAP[trait],
      SIGNAL_WEIGHTS.explicitDesired,
      "personality",
      "explicit_desired",
      "personality.attract",
      `Selected personality: ${trait}`,
    );
  }
  for (const word of session.personality.attract.custom) {
    addKeywords(word, SIGNAL_WEIGHTS.explicitDesired, "personality", "explicit_desired", "personality.attract", `Custom desired word: ${word}`, 1, add);
  }
  for (const trait of session.personality.avoid.selected) {
    addMapped(
      PERSONALITY_MAP[trait],
      SIGNAL_WEIGHTS.explicitRejection,
      "personality",
      "explicit_rejection",
      "personality.avoid",
      `Avoided personality: ${trait}`,
      -1,
    );
  }
  for (const word of session.personality.avoid.custom) {
    addKeywords(word, SIGNAL_WEIGHTS.explicitRejection, "personality", "explicit_rejection", "personality.avoid", `Custom avoided word: ${word}`, -1, add);
  }

  for (const dimension of session.personalitySpectrum.dimensions) {
    if (dimension.answer.state !== "selected") continue;
    const poles = SPECTRUM_POLES[dimension.id];
    const lean = (dimension.answer.value - 50) / 50;
    if (Math.abs(lean) < 0.16) continue;
    const toward = lean < 0 ? poles[0] : poles[1];
    const amount = SIGNAL_WEIGHTS.spectrum * Math.abs(lean);
    add(toward, amount, "spectrum", "spectrum", `spectrum.${dimension.id}`, `${dimension.leftLabel} / ${dimension.rightLabel} leans ${toward}`);
  }

  for (const comparison of session.visualPreferences.comparisons) {
    if (comparison.choice.state !== "selected") continue;
    const source = `visual.${comparison.comparisonId}`;
    if (comparison.choice.value === "neither") {
      for (const side of [comparison.a, comparison.b]) {
        for (const [trait, score] of Object.entries(side.traits)) {
          if (score < 0.6) continue;
          addMapped(
            VISUAL_TRAIT_MAP[trait] ?? [],
            SIGNAL_WEIGHTS.visualNeither * score,
            "visual",
            "visual_neither",
            source,
            `Neither board in ${comparison.comparisonId} (${side.id})`,
            -1,
          );
        }
      }
      continue;
    }
    const chosen =
      comparison.choice.value === "both"
        ? [comparison.a, comparison.b]
        : comparison.choice.value === "a"
          ? [comparison.a]
          : [comparison.b];
    const rejected =
      comparison.choice.value === "a" ? [comparison.b] : comparison.choice.value === "b" ? [comparison.a] : [];
    for (const side of chosen) {
      for (const [trait, score] of Object.entries(side.traits)) {
        if (score < 0.55) continue;
        addMapped(
          VISUAL_TRAIT_MAP[trait] ?? [],
          SIGNAL_WEIGHTS.visualChoice * score,
          "visual",
          "visual",
          source,
          `Visual board ${side.id}`,
        );
      }
    }
    for (const side of rejected) {
      for (const [trait, score] of Object.entries(side.traits)) {
        if (score < 0.7) continue;
        addMapped(
          VISUAL_TRAIT_MAP[trait] ?? [],
          SIGNAL_WEIGHTS.visualRejectedSide * score,
          "visual",
          "visual_rejected",
          source,
          `Passed over ${side.id}`,
          -1,
        );
      }
    }
  }

  for (const paletteId of session.colourPreferences.preferredPaletteIds) {
    const name = paletteById(paletteId)?.name ?? paletteId;
    addMapped(PALETTE_SIGNALS[paletteId] ?? [], SIGNAL_WEIGHTS.colour, "colour", "colour", "colour.preferred", `Preferred palette: ${name}`);
  }
  for (const paletteId of session.colourPreferences.avoidedPaletteIds) {
    const name = paletteById(paletteId)?.name ?? paletteId;
    addMapped(
      PALETTE_SIGNALS[paletteId] ?? [],
      SIGNAL_WEIGHTS.explicitRejection,
      "colour",
      "explicit_rejection",
      "colour.avoided",
      `Avoided palette: ${name}`,
      -1,
    );
  }

  for (const directionId of session.typographyPreferences.preferredDirectionIds) {
    const label = typeDirectionById(directionId).label;
    addMapped(TYPE_SIGNALS[directionId] ?? [], SIGNAL_WEIGHTS.typography, "typography", "typography", "typography.preferred", `Preferred type: ${label}`);
  }
  for (const directionId of session.typographyPreferences.avoidedDirectionIds) {
    const label = typeDirectionById(directionId).label;
    addMapped(
      TYPE_SIGNALS[directionId] ?? [],
      SIGNAL_WEIGHTS.explicitRejection,
      "typography",
      "explicit_rejection",
      "typography.avoided",
      `Avoided type: ${label}`,
      -1,
    );
  }

  for (const directionId of session.imageryPreferences.preferredDirectionIds) {
    addMapped(IMAGERY_SIGNALS[directionId] ?? [], SIGNAL_WEIGHTS.imagery, "imagery", "imagery", "imagery.preferred", `Preferred imagery: ${directionId}`);
  }
  for (const directionId of session.imageryPreferences.avoidedDirectionIds) {
    addMapped(
      IMAGERY_SIGNALS[directionId] ?? [],
      SIGNAL_WEIGHTS.explicitRejection,
      "imagery",
      "explicit_rejection",
      "imagery.avoided",
      `Avoided imagery: ${directionId}`,
      -1,
    );
  }

  for (const round of session.voicePreferences.comparisons) {
    if (round.choice.state !== "selected") continue;
    const optionId = round.choice.optionId;
    const chosen = round.options.find((item) => item.id === optionId);
    if (!chosen) continue;
    for (const [trait, score] of Object.entries(chosen.traits)) {
      if (score < 0.55) continue;
      add(trait, SIGNAL_WEIGHTS.voice * score, "voice", "voice", `voice.${round.roundId}`, `Voice line: ${chosen.text}`);
    }
  }

  const preferredLanguage = textOf(session.voicePreferences.preferredLanguage);
  const avoidedLanguage = textOf(session.voicePreferences.avoidedLanguage);
  if (preferredLanguage) {
    addKeywords(preferredLanguage, SIGNAL_WEIGHTS.inspiration, "voice", "inspiration", "voice.preferredLanguage", "Language they want to sound like", 1, add);
  }
  if (avoidedLanguage) {
    addKeywords(avoidedLanguage, SIGNAL_WEIGHTS.explicitRejection, "voice", "explicit_rejection", "voice.avoidedLanguage", "Language they want to avoid", -1, add);
  }

  session.inspiration.positiveReferences.forEach((reference, index) => {
    if (!reference.note) return;
    addKeywords(
      reference.note,
      SIGNAL_WEIGHTS.inspiration,
      "inspiration",
      "inspiration",
      `inspiration.admired.${index + 1}.note`,
      `Admired ${reference.name}: ${reference.note}`,
      1,
      add,
    );
  });
  session.inspiration.negativeReferences.forEach((reference, index) => {
    if (!reference.note) return;
    addKeywords(
      reference.note,
      SIGNAL_WEIGHTS.explicitRejection,
      "inspiration",
      "explicit_rejection",
      `inspiration.avoid.${index + 1}.note`,
      `Rejected ${reference.name}: ${reference.note}`,
      -1,
      add,
    );
  });

  for (const question of session.agentQuestions.selected) {
    if (question.response.state === "evidence" && question.response.text.trim()) {
      addKeywords(
        question.response.text,
        SIGNAL_WEIGHTS.clarification,
        "clarification",
        "clarification",
        `clarification.${question.id}`,
        "Clarification answer",
        1,
        add,
      );
    }
    if (question.id !== CREATIVE_FORK_ID || question.response.state !== "selected") continue;
    const optionId = question.response.optionId;
    if (!optionId.startsWith("fork:")) continue;
    const target = optionId.slice("fork:".length);
    const archetype = archetypeById(target);
    if (!archetype) continue;
    for (const [dimension, factor] of Object.entries(archetype.wants)) {
      add(
        dimension,
        SIGNAL_WEIGHTS.clarification * factor,
        "clarification",
        "clarification",
        `clarification.${question.id}`,
        `Creative fork leans toward ${archetype.name}`,
      );
    }
  }

  if (options.includeReaction !== false) {
    for (const reaction of session.territoryFeedback.reactions) {
      const archetype = archetypeById(reaction.territoryId);
      if (!archetype) continue;
      const weight =
        reaction.response === "very_close"
          ? SIGNAL_WEIGHTS.reactionClose
          : reaction.response === "something_here"
            ? SIGNAL_WEIGHTS.reactionSomething
            : -SIGNAL_WEIGHTS.reactionNot;
      const kind = reaction.response === "not_for_us" ? "reaction" : "reaction";
      for (const [dimension, factor] of Object.entries(archetype.wants)) {
        add(
          dimension,
          weight * factor,
          "reaction",
          kind,
          `territory.${reaction.territoryId}`,
          reaction.response === "not_for_us"
            ? `Cooled on ${archetype.name}`
            : `Responded to ${archetype.name}`,
        );
      }
    }
  }

  const reinforcement: CrossModalReinforcement[] = [];
  for (const [dimension, bucket] of buckets) {
    const modalities = [...bucket.modalities.entries()].filter(([, amount]) => amount >= 0.7).map(([modality]) => modality);
    if (modalities.length < 2) continue;
    const average = [...bucket.modalities.values()].reduce((sum, amount) => sum + amount, 0) / bucket.modalities.size;
    const bonus = 0.5 * (modalities.length - 1) * average;
    bucket.positive += bonus;
    bucket.groups[leadingGroup(bucket)] += bonus;
    reinforcement.push({
      dimension,
      modalities,
      summary: `${labelDimension(dimension)} is stronger because ${modalities.join(", ")} agree.`,
    });
    contributions.push({
      dimension,
      amount: bonus,
      modality: "reinforcement",
      kind: "reinforcement",
      source: "cross-modal",
      summary: reinforcement[reinforcement.length - 1]?.summary ?? "",
    });
  }

  const signals: BrandSignal[] = [];
  const nets: Record<string, number> = {};
  const hardAvoids: AvoidItem[] = [];
  const softAvoids: AvoidItem[] = [];

  for (const [dimension, bucket] of buckets) {
    const net = round(bucket.positive - bucket.negative);
    nets[dimension] = net;
    const mixed = bucket.positive >= 2 && bucket.negative >= 2 && Math.abs(bucket.positive - bucket.negative) < 2.4;
    const magnitude = Math.max(bucket.positive, bucket.negative);
    if (magnitude < 1.45 && !mixed) continue;
    const supporting = [...bucket.sources.values()].filter((item) => item.amount > 0).map((item) => item.summary);
    const conflicting = [...bucket.sources.values()].filter((item) => item.amount < 0).map((item) => item.summary);
    signals.push({
      dimension,
      group: groupFor(dimension, bucket),
      polarity: net < 0 ? "negative" : "positive",
      strength: mixed ? "mixed" : band(Math.abs(net)),
      net,
      evidenceCount: bucket.evidenceCount,
      evidenceSources: [...bucket.sources.keys()].filter((source) => source !== "cross-modal"),
      supportingEvidence: supporting,
      conflictingEvidence: conflicting,
    });
    const explicit = contributions.find(
      (item) => item.dimension === dimension && item.kind === "explicit_rejection" && item.amount < 0,
    );
    if (bucket.explicitNegative && bucket.negative >= 3.2 && explicit) {
      hardAvoids.push({
        kind: "hard",
        label: labelDimension(dimension),
        dimension,
        source: explicit.source,
        summary: explicit.summary,
      });
    } else if (bucket.negative >= 1.3 && !bucket.explicitNegative) {
      softAvoids.push({
        kind: "soft",
        label: labelDimension(dimension),
        dimension,
        source: conflictingSource(bucket) ?? "visual",
        summary: conflicting[0] ?? `A softer lean away from ${labelDimension(dimension)}.`,
      });
    }
  }

  signals.sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || a.dimension.localeCompare(b.dimension));
  const hardAvoidDimensions = hardAvoids
    .map((item) => item.dimension)
    .filter((dimension): dimension is string => !!dimension);
  const uniqueHard = hardAvoids.filter(
    (item, index) => hardAvoids.findIndex((other) => other.summary === item.summary) === index,
  );
  hardAvoids.length = 0;
  hardAvoids.push(...uniqueHard);

  const tensions: SignalTension[] = [];
  for (const [left, right] of TENSION_PAIRS) {
    const leftNet = nets[left] ?? 0;
    const rightNet = nets[right] ?? 0;
    if (leftNet < 2.4 || rightNet < 2.4) continue;
    tensions.push({
      left,
      right,
      statement: `${labelDimension(left)} and ${labelDimension(right)} are both supported. Averaging them would hide a useful fork.`,
    });
  }

  const uncertainty: string[] = [];
  if (signals.some((signal) => signal.strength === "mixed")) {
    uncertainty.push("Some signals are mixed. The territories keep that split instead of forcing one answer.");
  }
  if (signals.filter((signal) => signal.polarity === "positive").length < 3) {
    uncertainty.push("The picture is still thin. These territories are exploratory starting points.");
  }
  if (session.territoryFeedback.preference === "guidance") {
    uncertainty.push("The client asked the media manager to guide which direction to develop.");
  }

  return {
    signals,
    nets,
    hardAvoids,
    softAvoids,
    tensions,
    reinforcement,
    uncertainty,
    contributions,
    hardAvoidDimensions,
  };
}

function addKeywords(
  text: string,
  weight: number,
  modality: string,
  kind: string,
  source: string,
  summary: string,
  sign: number,
  add: (dimension: string, amount: number, modality: string, kind: string, source: string, summary: string) => void,
) {
  for (const entry of NOTE_PATTERNS) {
    if (!entry.pattern.test(text)) continue;
    for (const [dimension, factor] of entry.dimensions) {
      add(dimension, sign * weight * factor, modality, kind, source, summary);
    }
  }
}

function conflictingSource(bucket: Bucket): string | null {
  for (const [source, note] of bucket.sources) {
    if (note.amount < 0) return source;
  }
  return null;
}

function leadingGroup(bucket: Bucket): SignalGroup {
  const groups = Object.entries(bucket.groups) as Array<[SignalGroup, number]>;
  groups.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return groups[0]?.[0] ?? "semantic";
}

function groupFor(dimension: string, bucket: Bucket): SignalGroup {
  if (VOICE_DIMENSIONS.has(dimension) && Math.abs(bucket.groups.verbal) >= Math.abs(bucket.groups.semantic)) return "verbal";
  if (SEMANTIC_DIMENSIONS.has(dimension) && Math.abs(bucket.groups.semantic) > 0) return "semantic";
  return leadingGroup(bucket);
}

function band(magnitude: number): SignalStrength {
  if (magnitude >= 8) return "strong";
  if (magnitude >= 4) return "moderate";
  return "exploratory";
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function labelDimension(dimension: string): string {
  return dimension.charAt(0).toUpperCase() + dimension.slice(1);
}

export function signalsIn(model: BrandSignalModel, group: SignalGroup, polarity: "positive" | "negative" = "positive"): BrandSignal[] {
  return model.signals.filter((signal) => signal.group === group && signal.polarity === polarity);
}
