import { useNavigate } from 'react-router-dom';
import type { Exercise } from '@/types/exercise';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { formatDuration } from '@/utils/format';
import './ExerciseCard.css';

interface Props {
  exercise: Exercise;
}

/** A selectable rehabilitation exercise card. */
export function ExerciseCard({ exercise }: Props) {
  const navigate = useNavigate();
  const goToInstructions = () => navigate(`/exercise/${exercise.id}`);

  return (
    <article className="exercise-card">
      <div className="exercise-card__icon" aria-hidden="true">
        {exercise.icon}
      </div>
      <div className="exercise-card__body">
        <div className="row row--between">
          <h3 className="exercise-card__name">{exercise.name}</h3>
          <DifficultyBadge level={exercise.difficulty} />
        </div>
        <p className="exercise-card__desc">{exercise.shortDescription}</p>

        <dl className="exercise-card__meta">
          <div>
            <dt>Repetitions</dt>
            <dd>{exercise.targetReps} reps</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{formatDuration(exercise.estimatedSeconds * 1000)}</dd>
          </div>
        </dl>

        <button
          className="btn btn--primary btn--block"
          onClick={goToInstructions}
        >
          Start
        </button>
      </div>
    </article>
  );
}
