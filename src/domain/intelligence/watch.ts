import type { ManagerReaction, WatchState } from "../../types/intelligence";

export function emptyWatch(now: string): WatchState {
  return {
    signals: [],
    readings: [],
    reactions: [],
    jobs: [],
    revisions: [],
    memory: [],
    competitors: [],
    dailyBriefs: [],
    weeklyReads: [],
    updatedAt: now,
  };
}

export function normaliseWatch(value: Partial<WatchState> | null | undefined, now: string): WatchState {
  const blank = emptyWatch(now);
  if (!value) return blank;
  return {
    signals: value.signals ?? [],
    readings: value.readings ?? [],
    reactions: value.reactions ?? [],
    jobs: value.jobs ?? [],
    revisions: value.revisions ?? [],
    memory: value.memory ?? [],
    competitors: value.competitors ?? [],
    dailyBriefs: value.dailyBriefs ?? [],
    weeklyReads: value.weeklyReads ?? [],
    updatedAt: value.updatedAt || now,
  };
}

export function withStoredReaction(watch: WatchState, reaction: ManagerReaction): WatchState {
  const reactions = watch.reactions.filter((item) => !(item.targetId === reaction.targetId && item.action === reaction.action));
  const memory = watch.memory.map((entry) => entry.fingerprint === reaction.targetId ? { ...entry, reaction: reaction.action } : entry);
  return { ...watch, reactions: [...reactions, reaction], memory, updatedAt: reaction.at };
}
