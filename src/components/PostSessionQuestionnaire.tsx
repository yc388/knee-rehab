import { useState } from 'react';
import type { DifficultyRating, PatientReport } from '@/types/rehab';
import './PostSessionQuestionnaire.css';

interface Props {
  onSubmit: (report: PatientReport) => void;
  onSkip: () => void;
}

const DIFFICULTY: { id: DifficultyRating; label: string }[] = [
  { id: 'very-easy', label: 'Very Easy' },
  { id: 'easy', label: 'Easy' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'difficult', label: 'Difficult' },
  { id: 'very-difficult', label: 'Very Difficult' },
];

/**
 * Simple post-exercise questionnaire capturing subjective difficulty, pain and
 * discomfort. These patient-reported values are combined with measured metrics
 * in the resistance review.
 */
export function PostSessionQuestionnaire({ onSubmit, onSkip }: Props) {
  const [difficulty, setDifficulty] = useState<DifficultyRating | null>(null);
  const [pain, setPain] = useState(0);
  const [discomfort, setDiscomfort] = useState<boolean | null>(null);

  const canSubmit = difficulty !== null && discomfort !== null;

  return (
    <div className="quiz-overlay" role="dialog" aria-modal="true" aria-label="Post-session questionnaire">
      <div className="quiz card">
        <h2>How was your session?</h2>
        <p className="text-muted" style={{ marginTop: 0 }}>
          Your answers help review your exercise plan. They do not change your
          brace setting automatically.
        </p>

        <fieldset className="quiz__group">
          <legend>How difficult was this session?</legend>
          <div className="quiz__options">
            {DIFFICULTY.map((d) => (
              <button
                key={d.id}
                className={`quiz__opt${difficulty === d.id ? ' is-active' : ''}`}
                onClick={() => setDifficulty(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="quiz__group">
          <legend>What was your pain level during the exercise? ({pain}/10)</legend>
          <input
            type="range"
            min={0}
            max={10}
            value={pain}
            onChange={(e) => setPain(Number(e.target.value))}
            className="quiz__range"
          />
          <div className="quiz__rangelabels">
            <span>0 · none</span>
            <span>10 · severe</span>
          </div>
        </fieldset>

        <fieldset className="quiz__group">
          <legend>Did you experience unusual discomfort or instability?</legend>
          <div className="quiz__options">
            <button
              className={`quiz__opt${discomfort === false ? ' is-active' : ''}`}
              onClick={() => setDiscomfort(false)}
            >
              No
            </button>
            <button
              className={`quiz__opt quiz__opt--warn${discomfort === true ? ' is-active' : ''}`}
              onClick={() => setDiscomfort(true)}
            >
              Yes
            </button>
          </div>
        </fieldset>

        <div className="quiz__actions">
          <button className="btn btn--ghost" onClick={onSkip}>
            Skip
          </button>
          <button
            className="btn btn--primary"
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                difficulty: difficulty!,
                pain,
                discomfort: discomfort!,
              })
            }
          >
            Submit &amp; see recommendation
          </button>
        </div>
      </div>
    </div>
  );
}
