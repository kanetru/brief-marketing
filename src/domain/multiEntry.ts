/** Turn a natural list into names. Spaces inside a name stay intact. */
export function parseEntries(value: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of value.split(/[\n,;]+/)) {
    const name = part.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

export function joinEntries(values: readonly string[]): string {
  return values.join("\n");
}
