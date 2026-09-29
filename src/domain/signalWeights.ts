/**
 * Evidence weighting for the brand signal model.
 *
 * Direct client statements outweigh a single visual click.
 * Repeated choices accumulate. Explicit rejection outweighs a preference.
 * An AI observation is not a source: the underlying evidence is already counted,
 * and an interpretation must not outrank what the client actually did.
 *
 * Cross-modal reinforcement is applied later, in brandSignals.ts.
 * It amplifies a dimension only when two or more modalities agree.
 */

export const SIGNAL_WEIGHTS = {
  /** Personality they said they want, and custom desired words. */
  explicitDesired: 3.4,
  /** Personality, palette, type, imagery, or language they rejected. */
  explicitRejection: 4.6,
  /** One side of a visual comparison, multiplied by that board's trait score. */
  visualChoice: 1.05,
  /** The board they did not pick. Soft, so one "no" cannot dominate. */
  visualRejectedSide: 0.35,
  /** "Neither" on a comparison. Both boards' strong traits take this. */
  visualNeither: 0.7,
  /** Spectrum distance from the midpoint, times this. */
  spectrum: 2.6,
  colour: 1.8,
  typography: 1.9,
  imagery: 1.7,
  /** Voice comparison trait score, times this. */
  voice: 1.6,
  /** The reason they gave for an inspiration, not the name they mentioned. */
  inspiration: 2.5,
  /** A clarification answer, including a creative-fork choice. */
  clarification: 3,
  /** "Very close" on a territory. High, and still not a final decision. */
  reactionClose: 3.2,
  reactionSomething: 1.5,
  /** "Not for us". Strong negative, but not a hard avoid. */
  reactionNot: 3.4,
} as const;

export const WEIGHTING_NOTES = [
  "Explicit desired traits carry high weight.",
  "Explicit rejection carries higher negative weight than a desire carries positive weight.",
  "A single visual choice is real evidence and cannot, on its own, outrank a direct statement.",
  "Repeated visual selections accumulate inside the visual modality.",
  "Spectrum positions carry moderate-to-high weight once they leave the middle.",
  "Colour, type, imagery, and voice each carry their own weight.",
  "An inspiration note is scored from the reason they gave.",
  "Derived AI interpretation is not fed back in. Weight 0, on purpose.",
  "A clarification answer carries high weight.",
  "A territory reaction carries high weight and does not become a hard avoid.",
  "Cross-modal agreement multiplies a dimension. Five clicks on one screen do not.",
].join(" ");
