import type { ResistanceRecommendation, ApprovalStatus } from '@/types/rehab';
import './WeightRecommendationCard.css';

interface Props {
  rec: ResistanceRecommendation;
  /** Whether the current user may approve/reject (clinician role). */
  canReview: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}

const CATEGORY_LABEL = {
  'consider-increase': 'Consider Increase',
  maintain: 'Maintain',
  'review-reduce': 'Review for Reduction',
} as const;

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

/**
 * Visual card for a post-session resistance recommendation. Shows current and
 * proposed weight, the recommendation category, the evidence-based reason and
 * the approval status. An authorised reviewer can approve/reject. Approving
 * does NOT change the physical brace — it only sets the planned app value for
 * the next session.
 */
export function WeightRecommendationCard({
  rec,
  canReview,
  onApprove,
  onReject,
}: Props) {
  return (
    <div className={`wrec wrec--${rec.category}`}>
      <div className="wrec__head">
        <h3>AI-Assisted Resistance Review</h3>
        <span className="wrec__provenance">rule-based · for review</span>
      </div>

      <p className="wrec__headline">{rec.headline}</p>

      <div className="wrec__weights">
        <div className="wrec__weight">
          <span className="wrec__wlabel">Current weight</span>
          <span className="wrec__wval">{rec.currentKg.toFixed(1)} kg</span>
        </div>
        <span className="wrec__arrow" aria-hidden="true">
          →
        </span>
        <div className="wrec__weight">
          <span className="wrec__wlabel">Proposed next weight</span>
          <span className="wrec__wval">
            {rec.proposedKg !== null
              ? `${rec.proposedKg.toFixed(1)} kg`
              : 'Pending Review'}
          </span>
        </div>
      </div>

      <dl className="wrec__meta">
        <div>
          <dt>Recommendation</dt>
          <dd>{CATEGORY_LABEL[rec.category]}</dd>
        </div>
        <div>
          <dt>Approval status</dt>
          <dd>
            <span className={`wrec__status wrec__status--${rec.status}`}>
              {STATUS_LABEL[rec.status]}
            </span>
          </dd>
        </div>
      </dl>

      <p className="wrec__reason">
        <strong>Reason:</strong> {rec.reason}
      </p>

      {rec.clinicalReviewRecommended && (
        <p className="wrec__clinical">
          ⚠️ Clinical review recommended before progressing.
        </p>
      )}

      {canReview && rec.status === 'pending' && (
        <div className="wrec__actions">
          <button className="btn btn--primary" onClick={onApprove}>
            Approve recommendation
          </button>
          <button className="btn btn--ghost" onClick={onReject}>
            Reject
          </button>
        </div>
      )}
      {!canReview && rec.status === 'pending' && (
        <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>
          A physiotherapist (authorised role) can review this recommendation.
        </p>
      )}
    </div>
  );
}
