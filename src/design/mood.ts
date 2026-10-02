const QUIET = new Set(["calm", "natural", "refined", "traditional"]);
const EXPRESSIVE = new Set(["bold", "rebellious", "energetic", "playful"]);

/** A light shift in the room. It does not reskin the product. */
export function experienceMood(selected: string[]): "quiet" | "expressive" | "steady" {
  const quiet = selected.filter((id) => QUIET.has(id)).length;
  const loud = selected.filter((id) => EXPRESSIVE.has(id)).length;
  if (quiet > loud && quiet > 0) return "quiet";
  if (loud > quiet && loud > 0) return "expressive";
  return "steady";
}
