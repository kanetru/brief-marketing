import { jobIsDue, nextRunAt } from "./cadence";
import { collapseSignals } from "./signals";
import type { MonitoringJob, RefreshCadence, WatchState } from "../../types/intelligence";
import type { ProviderBatch } from "./providers";

export function makeJob(brandId: string, provider: string, jobType: string, cadence: RefreshCadence, now: string, ran: boolean): MonitoringJob {
  return {
    id: `${brandId}:${provider}`,
    brandId,
    provider,
    jobType,
    cadence,
    lastRunAt: ran ? now : "",
    nextRunAt: ran ? nextRunAt(cadence, now) : now,
    status: ran ? "ok" : "idle",
    lastError: "",
  };
}

export interface JobRunner {
  (job: MonitoringJob, now: string): ProviderBatch;
}

/**
 * Manual runner. There is no background worker.
 * A failed provider leaves the signals already stored.
 */
export function runDueJobs(state: WatchState, now: string, run: JobRunner): WatchState {
  let signals = state.signals;
  const jobs = state.jobs.map((job) => {
    if (!jobIsDue(job, now)) return job;
    try {
      const batch = run(job, now);
      if (batch.error) {
        return { ...job, status: "error" as const, lastError: batch.error, lastRunAt: now, nextRunAt: nextRunAt(job.cadence, now) };
      }
      signals = collapseSignals([...signals, ...batch.signals]);
      return { ...job, status: "ok" as const, lastError: "", lastRunAt: now, nextRunAt: nextRunAt(job.cadence, now) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Provider failed";
      return { ...job, status: "error" as const, lastError: message, lastRunAt: now, nextRunAt: nextRunAt(job.cadence, now) };
    }
  });
  return { ...state, signals, jobs, updatedAt: now };
}
