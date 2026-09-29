import type {
  AgentObservation,
  AnalysisFailureCode,
  CandidateQuestion,
} from "../types/discovery";

export interface AnalysisSuccess {
  ok: true;
  analysisVersion: string;
  provider: string;
  model: string;
  observations: AgentObservation[];
  selected: CandidateQuestion[];
  candidates: CandidateQuestion[];
  rawModelResponse: unknown;
}

export interface AnalysisFailure {
  ok: false;
  error: AnalysisFailureCode;
}

export type AnalysisResult = AnalysisSuccess | AnalysisFailure;
