/** True when a key event is happening inside text the person is editing. */
export function isEditingTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const node = target as { nodeName?: string; isContentEditable?: boolean; closest?: (selector: string) => unknown };
  const name = node.nodeName?.toUpperCase() ?? "";
  if (name === "INPUT" || name === "TEXTAREA" || name === "SELECT") return true;
  if (node.isContentEditable) return true;
  return Boolean(node.closest?.("input, textarea, select, [contenteditable='true']"));
}

/** Space, Enter, and arrows belong to the field while someone is typing. */
export function shouldIgnoreNavigationKey(event: { key: string; target: EventTarget | null }): boolean {
  if (!isEditingTarget(event.target)) return false;
  return event.key === " " || event.key === "Enter" || event.key.startsWith("Arrow");
}
