import type { MonitoringJob, RefreshCadence } from "../../types/intelligence";

const HOUR = 60 * 60 * 1000;

const LENGTH: Record<RefreshCadence, number> = {
  hourly: HOUR,
  daily: 24 * HOUR,
  weekly: 7 * 24 * HOUR,
  manual: Number.POSITIVE_INFINITY,
};

export function cadenceLength(cadence: RefreshCadence): number {
  return LENGTH[cadence];
}

export function nextRunAt(cadence: RefreshCadence, from: string): string {
  if (cadence === "manual") return "";
  return new Date(Date.parse(from) + LENGTH[cadence]).toISOString();
}

export function jobIsDue(job: MonitoringJob, now: string): boolean {
  if (job.cadence === "manual") return false;
  if (!job.nextRunAt) return true;
  return Date.parse(job.nextRunAt) <= Date.parse(now);
}
