/**
 * Rehabilitation-management domain types: patient profile, schedule/calendar,
 * resistance (brace weight) settings & approvals, patient-reported outcomes,
 * and weekly reports.
 *
 * Provenance is explicit throughout. Each piece of information is tagged so the
 * UI can always distinguish:
 *   - measured sensor data,
 *   - calculated performance metrics,
 *   - AI-generated / rule-based insights,
 *   - clinician-approved changes.
 */

/** The provenance of a value or recommendation. */
export type Provenance =
  | 'measured' // from sensor data
  | 'calculated' // derived metric
  | 'rule-based' // produced by the rule engine (not a trained model)
  | 'clinician-approved' // confirmed by an authorised user
  | 'demonstration'; // seeded demo data

/** Device resistance limits. The brace supports 1.5–5.0 kg. */
export const WEIGHT_MIN_KG = 1.5;
export const WEIGHT_MAX_KG = 5.0;
/** Default increment until the real hardware spec is confirmed (configurable). */
export const WEIGHT_INCREMENT_KG = 0.5;

/** Clamp a weight to the device's supported range. */
export function clampWeight(kg: number): number {
  return Math.min(Math.max(kg, WEIGHT_MIN_KG), WEIGHT_MAX_KG);
}

/** Approval lifecycle for any proposed change. */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/** A brace resistance setting, with approval + provenance. */
export interface ResistanceSetting {
  kg: number;
  status: ApprovalStatus;
  /** ISO date the value took effect / was recorded. */
  effectiveAt: string;
  provenance: Provenance;
  /** Optional note (e.g. why it was proposed). */
  note?: string;
}

/** The three resistance-review outcomes (never auto-prescribed). */
export type ResistanceReviewCategory =
  | 'consider-increase' // A. Progression review
  | 'maintain' // B. Maintain current weight
  | 'review-reduce'; // C. Reduce load / clinical review

/** A resistance recommendation produced after a session (rule-based). */
export interface ResistanceRecommendation {
  category: ResistanceReviewCategory;
  currentKg: number;
  /** Proposed next value — only set when a configured protocol allows it. */
  proposedKg: number | null;
  headline: string;
  reason: string;
  status: ApprovalStatus;
  provenance: Provenance;
  /** True if data was insufficient / unreliable for a confident review. */
  insufficientData: boolean;
  /** True if clinical review is explicitly recommended. */
  clinicalReviewRecommended: boolean;
}

/** Subjective post-exercise questionnaire. */
export type DifficultyRating =
  | 'very-easy'
  | 'easy'
  | 'moderate'
  | 'difficult'
  | 'very-difficult';

export interface PatientReport {
  difficulty: DifficultyRating;
  /** Pain level 0–10. */
  pain: number;
  /** Unusual discomfort or instability during the exercise. */
  discomfort: boolean;
}

/** Patient profile. */
export interface PatientProfile {
  id: string;
  name: string;
  createdAt: string;
  /** True until the initial 1.5 kg setting is confirmed by a clinician. */
  initialSettingPendingApproval: boolean;
  /** Whether the one-time assessment has been completed. */
  assessmentComplete: boolean;
}

/** A scheduled rehabilitation session (calendar event). */
export interface ScheduledSession {
  id: string;
  /** ISO date-time of the session start. */
  dateTime: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  /** Target knee angle for the session, degrees. */
  targetAngle: number;
  /** Planned brace weight for the session, kg. */
  plannedWeightKg: number;
  status: SessionCalendarStatus;
  /** If completed, the id of the stored SessionSummary. */
  completedSessionId?: string;
  provenance: Provenance;
}

export type SessionCalendarStatus =
  | 'upcoming'
  | 'completed'
  | 'missed'
  | 'rest';

/** A record linking a stored exercise session to its context. */
export interface SessionContext {
  /** Weight used during the session, kg. */
  weightKg: number;
  report: PatientReport | null;
  recommendation: ResistanceRecommendation | null;
  /** The scheduled session this fulfilled, if any. */
  scheduledSessionId?: string;
}

/** A week-over-week comparison of a single metric. */
export interface WeeklyMetricComparison {
  label: string;
  unit: string;
  previous: number | null;
  current: number | null;
  /** 'improved' | 'declined' | 'stable' | 'insufficient'. */
  trend: 'improved' | 'declined' | 'stable' | 'insufficient';
  /** True if the comparison is reliable (similar conditions, enough data). */
  reliable: boolean;
}

/** A generated weekly rehabilitation report. */
export interface WeeklyReport {
  id: string;
  /** ISO date of the Monday that starts the week. */
  weekStart: string;
  sessionsCompleted: number;
  sessionsScheduled: number;
  adherencePct: number;
  comparisons: WeeklyMetricComparison[];
  recommendations: WeeklyRecommendation[];
  provenance: Provenance;
  /** True if there was not enough data for a meaningful report. */
  insufficientData: boolean;
}

export type WeeklyRecommendationCategory =
  | 'continue'
  | 'review-resistance'
  | 'review-difficulty'
  | 'review-selection'
  | 'review-pain';

export interface WeeklyRecommendation {
  category: WeeklyRecommendationCategory;
  headline: string;
  detail: string;
  provenance: Provenance;
}

/** A proposed schedule for the following week, pending approval. */
export interface ProposedPlan {
  id: string;
  weekStart: string;
  sessions: ScheduledSession[];
  status: ApprovalStatus;
  basedOnReportId: string;
  provenance: Provenance;
}
