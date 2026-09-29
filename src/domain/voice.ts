import type { VoiceOptionSnapshot, VoiceTrait, VoiceTraitScores } from "../types/discovery";

export const VOICE_TRAITS = [
  "formal",
  "conversational",
  "reserved",
  "expressive",
  "technical",
  "simple",
  "confident",
  "humble",
  "polished",
  "human",
  "promotional",
  "understated",
] as const satisfies readonly VoiceTrait[];

export interface VoiceOptionDefinition {
  id: string;
  text: string;
  traits: VoiceTraitScores;
}

export interface VoiceRoundDefinition {
  id: string;
  /** The situation, not a tone label. */
  situation: string;
  options: readonly VoiceOptionDefinition[];
}

function traits(partial: Partial<VoiceTraitScores>): VoiceTraitScores {
  const scores = {} as VoiceTraitScores;
  for (const trait of VOICE_TRAITS) scores[trait] = partial[trait] ?? 0;
  return scores;
}

/** Controlled catalogue. The client sees the sentences, not these scores. */
export const VOICE_ROUNDS: readonly VoiceRoundDefinition[] = [
  {
    id: "voice-introduce",
    situation: "Introducing the work",
    options: [
      {
        id: "introduce-formal",
        text: "Exceptional work, thoughtfully delivered.",
        traits: traits({ formal: 0.9, polished: 0.8, reserved: 0.7, confident: 0.6, understated: 0.4 }),
      },
      {
        id: "introduce-human",
        text: "We care about doing good work — and doing it properly.",
        traits: traits({ human: 0.9, humble: 0.7, conversational: 0.8, simple: 0.7, understated: 0.4 }),
      },
      {
        id: "introduce-quiet",
        text: "Good work speaks for itself.",
        traits: traits({ understated: 0.9, reserved: 0.8, simple: 0.8, confident: 0.5, polished: 0.3 }),
      },
      {
        id: "introduce-push",
        text: "Ready to do things differently?",
        traits: traits({ promotional: 0.8, expressive: 0.8, confident: 0.7, conversational: 0.6 }),
      },
    ],
  },
  {
    id: "voice-standard",
    situation: "Talking about the standard you hold",
    options: [
      {
        id: "standard-formal",
        text: "Standards matter. We don't rush the work.",
        traits: traits({ formal: 0.7, reserved: 0.7, confident: 0.8, polished: 0.5, simple: 0.6 }),
      },
      {
        id: "standard-human",
        text: "We'll tell you if something isn't right — kindly, and early.",
        traits: traits({ human: 0.9, humble: 0.6, conversational: 0.8, simple: 0.7 }),
      },
      {
        id: "standard-detail",
        text: "The details are the work.",
        traits: traits({ understated: 0.8, reserved: 0.7, polished: 0.6, technical: 0.4, confident: 0.5 }),
      },
      {
        id: "standard-line",
        text: "This is the bit we refuse to compromise on.",
        traits: traits({ expressive: 0.8, confident: 0.9, human: 0.5, promotional: 0.3 }),
      },
    ],
  },
  {
    id: "voice-explain",
    situation: "Explaining what you actually do",
    options: [
      {
        id: "explain-formal",
        text: "A considered approach to communication, from first idea to what people actually see.",
        traits: traits({ formal: 0.7, polished: 0.7, simple: 0.5, reserved: 0.4, confident: 0.5 }),
      },
      {
        id: "explain-human",
        text: "We help you show up in a way that feels like you — and still gets the work in.",
        traits: traits({ conversational: 0.9, human: 0.8, simple: 0.7, humble: 0.4 }),
      },
      {
        id: "explain-technical",
        text: "Strategy, content, and the systems that keep it consistent.",
        traits: traits({ technical: 0.8, confident: 0.6, reserved: 0.6, simple: 0.4, polished: 0.4 }),
      },
      {
        id: "explain-quiet",
        text: "Less noise. Clearer work. People who get it.",
        traits: traits({ understated: 0.8, simple: 0.8, confident: 0.6, reserved: 0.4 }),
      },
    ],
  },
  {
    id: "voice-invite",
    situation: "Inviting someone to get in touch",
    options: [
      {
        id: "invite-formal",
        text: "When you're ready, we'd be glad to talk.",
        traits: traits({ formal: 0.7, humble: 0.8, reserved: 0.7, understated: 0.6 }),
      },
      {
        id: "invite-hello",
        text: "If this sounds like your kind of thing, come and say hello.",
        traits: traits({ conversational: 0.9, human: 0.8, simple: 0.6, humble: 0.3 }),
      },
      {
        id: "invite-direct",
        text: "Tell us what you're trying to do. We'll tell you if we're the right people.",
        traits: traits({ confident: 0.8, simple: 0.7, human: 0.7, humble: 0.5, conversational: 0.6 }),
      },
      {
        id: "invite-push",
        text: "Let's make something people remember.",
        traits: traits({ promotional: 0.8, expressive: 0.8, confident: 0.7 }),
      },
    ],
  },
];

export function snapshotVoiceOption(option: VoiceOptionDefinition): VoiceOptionSnapshot {
  return { id: option.id, text: option.text, traits: { ...option.traits } };
}

export function strongTraits(scores: VoiceTraitScores, threshold = 0.6): string[] {
  return VOICE_TRAITS.filter((trait) => scores[trait] >= threshold);
}
