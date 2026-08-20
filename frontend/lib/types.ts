export interface JobPosting {
  role_title: string | null;
  company_name: string | null;
  seniority_level: string | null;
  location: string | null;
  salary: string | null;
  responsibilities: string[];
  required_qualifications: string[];
  preferred_qualifications: string[];
  raw_source_url: string;
}

export interface CompanyContext {
  company_name: string | null;
  mission: string | null;
  recent_announcements: string[];
  tech_stack_mentions: string[];
  culture_signals: string[];
  raw_source_url: string;
}

export type RunStatus = "success" | "partial" | "failed";

export interface SelfHealEvent {
  field: string;
  detail: string;
}

export interface CollectorRun {
  run_id: string;
  collector_name: string;
  target_url: string;
  status: RunStatus;
  fields_recovered: string[];
  fields_missing: string[];
  self_heal_events: SelfHealEvent[];
  started_at: string;
  finished_at: string | null;
}

export interface CoverLetterResult {
  cover_letter: string;
  job_posting: JobPosting;
  job_url: string;
}

export interface CoverLetterResponse {
  results: CoverLetterResult[];
  company_context: CompanyContext | null;
  runs: CollectorRun[];
}
