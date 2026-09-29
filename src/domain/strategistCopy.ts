import type { SignalEvidenceNote } from "../types/brandIntelligence";

const BOARD_FEEL: Record<string, string> = {
  "editorial-organic": "editorial and organic",
  "strict-minimal": "strict and minimal",
  "technical-cool": "technical and cool",
  "raw-expressive": "raw and expressive",
  "classic-polished": "classic and polished",
  "playful-warm": "playful and warm",
  "contemporary-bold": "bold and contemporary",
  "restrained-warm": "restrained and warm",
  "expressive-editorial": "expressive and editorial",
  "organic-raw": "organic and raw",
  "documentary-human": "documentary and human",
  "art-directed": "art-directed",
  "tactile-craft": "tactile and crafted",
  "geometric-clean": "geometric and clean",
  "warm-editorial": "warm and editorial",
  "cool-quiet": "cool and quiet",
  "quiet-craft": "quiet and crafted",
  "lively-craft": "lively and crafted",
  "quiet-grid": "quiet and gridded",
  "loud-grid": "loud and gridded",
};

/** Headline rationale. Reads as a strategist, and keeps the raw notes underneath. */
export function writeRationale(name: string, oneLineIdea: string, sources: SignalEvidenceNote[]): string {
  if (sources.length === 0) {
    return `${name} is an exploratory starting point. The discovery does not yet point hard in one direction.`;
  }
  const reading = synthesise(sources);
  return `Your discovery points toward ${name}. ${oneLineIdea} ${reading} This is a territory to explore, not a finished identity.`;
}

export function synthesise(sources: SignalEvidenceNote[]): string {
  const personality: string[] = [];
  const boards: string[] = [];
  const palettes: string[] = [];
  const types: string[] = [];
  const imagery: string[] = [];
  const voice: string[] = [];
  const admired: string[] = [];
  const spectrum: string[] = [];
  const words: string[] = [];

  for (const source of sources.slice(0, 6)) {
    const summary = source.summary.trim();
    const personalityMatch = /^Selected personality: (.+)$/.exec(summary);
    const boardMatch = /^Visual board (.+)$/.exec(summary);
    const paletteMatch = /^Preferred palette: (.+)$/.exec(summary);
    const typeMatch = /^Preferred type: (.+)$/.exec(summary);
    const imageryMatch = /^Preferred imagery: (.+)$/.exec(summary);
    const voiceMatch = /^Voice line: (.+)$/.exec(summary);
    const admiredMatch = /^Admired (.+): (.+)$/.exec(summary);
    const spectrumMatch = /^(.+) \/ (.+) leans (.+)$/.exec(summary);
    const wordMatch = /^Custom desired word: (.+)$/.exec(summary);
    if (personalityMatch?.[1]) personality.push(personalityMatch[1]);
    else if (boardMatch?.[1]) boards.push(BOARD_FEEL[boardMatch[1]] ?? boardMatch[1].replace(/-/g, " "));
    else if (paletteMatch?.[1]) palettes.push(paletteMatch[1]);
    else if (typeMatch?.[1]) types.push(typeMatch[1]);
    else if (imageryMatch?.[1]) imagery.push(imageryMatch[1].replace(/_/g, " "));
    else if (voiceMatch?.[1]) voice.push(voiceMatch[1]);
    else if (admiredMatch?.[1] && admiredMatch[2]) admired.push(`${admiredMatch[1]} (${admiredMatch[2]})`);
    else if (spectrumMatch?.[1] && spectrumMatch[2] && spectrumMatch[3]) {
      const away = spectrumMatch[3].toLowerCase() === spectrumMatch[1].toLowerCase() ? spectrumMatch[2] : spectrumMatch[1];
      spectrum.push(`${spectrumMatch[3]}, away from ${away.toLowerCase()}`);
    }
    else if (wordMatch?.[1]) words.push(wordMatch[1]);
  }

  const parts: string[] = [];
  if (personality.length > 0) parts.push(`they described themselves as ${list(personality)}`);
  if (boards.length > 0) {
    parts.push(
      boards.length > 1
        ? `they repeatedly chose compositions that feel ${boards.slice(0, 3).join("; ")}`
        : `they chose a composition that feels ${boards[0]}`,
    );
  }
  if (palettes.length > 0) parts.push(`they moved toward ${list(palettes).toLowerCase()} colour`);
  if (types.length > 0) parts.push(`they leaned toward ${list(types).toLowerCase()} type`);
  if (imagery.length > 0) parts.push(`they preferred ${list(imagery).toLowerCase()} imagery`);
  if (voice.length > 0) parts.push(`a line they chose was “${voice[0]}”`);
  if (admired.length > 0) parts.push(`they admired ${admired[0]}`);
  if (spectrum.length > 0) parts.push(`they placed themselves toward ${spectrum[0]}`);
  if (words.length > 0) parts.push(`they added the word “${words[0]}”`);

  if (parts.length === 0) {
    return "The pattern is still light, so treat this as a direction to test.";
  }
  if (parts.length === 1) {
    const only = parts[0] ?? "";
    return `${only.charAt(0).toUpperCase()}${only.slice(1)}.`;
  }
  return `There's a consistent lean here: ${parts.slice(0, 3).join(", and ")}.`;
}

export function list(items: string[]): string {
  const unique = [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  if (unique.length <= 1) return unique[0] ?? "";
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]}`;
}
