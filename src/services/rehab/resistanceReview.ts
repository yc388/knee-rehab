import type { SessionSummary } from '@/types/exercise';
import type {
  PatientReport,
  ResistanceRecommendation,
  ResistanceReviewCategory,
} from '@/types/rehab';
import {
  evaluateProtocol,
  DEFAULT_PROTOCOL,
  type ProgressionProtocol,
  type Outcome,
} from './progressionProtocol';

const HEADLINES: Record<ResistanceReviewCategory, string> = {
  'consider-increase':
    'Your exercise performance met the configured targets. A resistance increase may be considered at your next review.',
  maintain:
    'Your current brace setting appears consistent with your exercise plan. Continue at the approved setting unless your physiotherapist advises otherwise.',
  'review-reduce':
    'Your performance or reported symptoms indicate that your exercise plan should be reviewed before progressing. Please consult your physiotherapist.',
};

/**
 * Build a post-session resistance recommendation by combining measured session
 * metrics with the patient's subjective report, evaluated against a
 * clinician-configurable protocol.
 *
 * The result is a *recommendation for review* — it is created with status
 * 'pending' and never changes the actual brace load.
 */
export function buildResistanceRecommendation(params: {
  session: SessionSummary;
  report: PatientReport | null;
  currentKg: number;
  dataReliable: boolean;
  protocol?: ProgressionProtocol;
}): ResistanceRecommendation {
  const { session, report, currentKg, dataReliable } = params;
  const protocol = params.protocol ?? DEFAULT_PROTOCOL;

  const completionFraction =
    session.targetReps > 0 ? session.goodReps / session.targetReps : 0;

  const result = evaluateProtocol(
    {
      completionFraction,
      consistency: session.consistencyScore,
      smoothness: session.smoothnessScore,
      incompleteReps: session.incompleteReps,
      pain: report ? report.pain : null,
      discomfort: report ? report.discomfort : null,
      difficulty: report ? report.difficulty : null,
      dataReliable,
      currentKg,
    },
    protocol
  );

  const category = outcomeToCategory(result.outcome);

  return {
    category,
    currentKg,
    proposedKg: result.proposedKg,
    headline: HEADLINES[category],
    reason: result.reason,
    status: 'pending',
    provenance: 'rule-based',
    insufficientData: result.insufficientData,
    clinicalReviewRecommended: result.clinicalReviewRecommended,
  };
}

function outcomeToCategory(o: Outcome): ResistanceReviewCategory {
  return o;
}
