// Shared AI types used by both server routes and client components.
// Import with `import type { ... } from '@/lib/ai-types'` — safe in both environments.

export interface ParsedPerson {
  name: string;
  relationship: string;
  notes: string | null;
}

export interface ParsedMemory {
  kind: 'photo' | 'music' | 'memory';
  title: string;
  description: string | null;
  prompt: string | null;
  era_year: number | null;
}

export interface ParsedRoutine {
  title: string;
  time_of_day: string;
  days_of_week: string[];
  instructions: string | null;
}

export interface ParsedPatientUpdate {
  name: string | null;
  home_location_text: string | null;
}

export interface ParseNotesResponse {
  people: ParsedPerson[];
  memories: ParsedMemory[];
  routines: ParsedRoutine[];
  patient: ParsedPatientUpdate;
}

export interface SaveSuggestionsRequest {
  people: ParsedPerson[];
  memories: ParsedMemory[];
  routines: ParsedRoutine[];
  patient: ParsedPatientUpdate | null;
}

export interface SaveSuggestionsResponse {
  saved: {
    people: number;
    memories: number;
    routines: number;
    patientUpdated: boolean;
  };
}

export interface SuggestPromptsRequest {
  person?: string;
  era?: string;
  background?: string;
}

export interface SuggestPromptsResponse {
  items: ParsedMemory[];
}

export interface DailySummaryResponse {
  summary: string;
  periodLabel: string;
}

export interface CompanionRequest {
  question: string;
}

export interface CompanionResponse {
  answer: string;
  deferred: boolean;
}
