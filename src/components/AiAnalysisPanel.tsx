import type { MovementAnalysis, InferenceTiming } from '@/types/analysis';
import './AiAnalysisPanel.css';

interface Props {
  analysis: MovementAnalysis;
  timing: InferenceTiming | null;
  methodLabel: string;
  isTrainedModel: boolean;
}

const PHASE_LABEL: Record<MovementAnalysis['phase'], string> = {
  ready: 'Ready',
  concentric: 'Moving to target',
  hold: 'Holding',
  eccentric: 'Returning',
  rest: 'Resting',
};

const ROM_LABEL: Record<MovementAnalysis['romAssessment'], string> = {
  'below-target': 'Below target',
  'near-target': 'Near target',
  'at-target': 'At target',
  'exceeds-target': 'Exceeds target',
};

/**
 * Edge AI Movement Analysis panel for the live session. Shows the current
 * movement phase, rep classification, smoothness, ROM assessment, the
 * evidence-based feedback, the ACTUAL measured inference latency and the active
 * processing mode. Clearly labels rule-based vs trained-model analysis.
 */
export function AiAnalysisPanel({
  analysis,
  timing,
  methodLabel,
  isTrainedModel,
}: Props) {
  return (
    <div className="ai-panel">
      <div className="ai-panel__head">
        <h3>
          Edge AI Movement Analysis
          <span className="ai-panel__method">
            {isTrainedModel ? 'trained model' : 'rule-based'}
          </span>
        </h3>
        <span className="ai-panel__methodfull">{methodLabel}</span>
      </div>

      <div className="ai-panel__phase">
        <span className={`ai-phase ai-phase--${analysis.phase}`}>
          {PHASE_LABEL[analysis.phase]}
        </span>
        {analysis.lastRepClassification && (
          <span
            className={`ai-class ai-class--${analysis.lastRepClassification}`}
          >
            last rep: {analysis.lastRepClassification.replace('-', ' ')}
          </span>
        )}
      </div>

      <div className="ai-panel__bars">
        <Bar label="Smoothness" value={analysis.smoothness} unit="/100" />
        <Bar label="Consistency" value={analysis.consistency} unit="/100" />
      </div>

      <dl className="ai-panel__grid">
        <div>
          <dt>Range of motion</dt>
          <dd>{ROM_LABEL[analysis.romAssessment]}</dd>
        </div>
        <div>
          <dt>Good reps</dt>
          <dd>
            {analysis.goodReps}
            {analysis.incompleteReps > 0 && (
              <span className="ai-panel__muted">
                {' '}
                · {analysis.incompleteReps} incomplete
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Inference latency</dt>
          <dd>
            {timing ? `${timing.inferenceMs.toFixed(2)} ms` : '—'}
            {timing?.simulated && <span className="ai-panel__tag">sim</span>}
          </dd>
        </div>
        <div>
          <dt>Total processing</dt>
          <dd>{timing ? `${timing.totalMs.toFixed(1)} ms` : '—'}</dd>
        </div>
        {timing?.sensorToFeedbackMs != null && (
          <div>
            <dt>Sensor→feedback</dt>
            <dd>{timing.sensorToFeedbackMs.toFixed(0)} ms</dd>
          </div>
        )}
        <div>
          <dt>Processing mode</dt>
          <dd className="ai-panel__cap">{timing?.location ?? '—'}</dd>
        </div>
      </dl>

      <div className="ai-panel__feedback" aria-live="polite">
        {analysis.feedback}
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="ai-bar">
      <div className="ai-bar__top">
        <span>{label}</span>
        <strong>
          {Math.round(value)}
          {unit}
        </strong>
      </div>
      <div className="ai-bar__track">
        <div className="ai-bar__fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
