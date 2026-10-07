import type { RepetitionConfig } from '@/types/exercise';

export type MovementStatus =
  | 'Good movement'
  | 'Extend your knee slightly further'
  | 'Bend your knee slightly further'
  | 'Move more slowly'
  | 'Hold this position'
  | 'Return to starting position';

/**
 * Derive a simple, single real-time cue for the patient from the current
 * motion. Kept intentionally minimal so the live screen stays calm.
 *
 * `progress` is how far through the current movement the knee is: 0 at the
 * start zone, 1 at the target zone.
 */
export function getMovementFeedback(
  angle: number,
  angularVelocity: number,
  config: RepetitionConfig
): MovementStatus {
  const { startAngle, targetAngle, targetTolerance, startTolerance } = config;
  const speed = Math.abs(angularVelocity);
  const flexionExercise = targetAngle > startAngle;

  const nearTarget = Math.abs(angle - targetAngle) <= targetTolerance;
  const nearStart = Math.abs(angle - startAngle) <= startTolerance;

  // Too fast — ask the patient to slow down (safety / quality).
  if (speed > 120) {
    return 'Move more slowly';
  }

  // At the peak and nearly still → encourage the hold.
  if (nearTarget && speed < 12) {
    return 'Hold this position';
  }

  // Close to the peak but short of it → nudge towards full range.
  if (!nearTarget && isApproachingTarget(angle, config)) {
    const shortOfTarget = flexionExercise
      ? angle < targetAngle - targetTolerance
      : angle > targetAngle + targetTolerance;
    if (shortOfTarget && speed < 20) {
      return flexionExercise
        ? 'Bend your knee slightly further'
        : 'Extend your knee slightly further';
    }
  }

  // Reached the peak and now needs to come back.
  if (nearTarget) {
    return 'Return to starting position';
  }

  if (nearStart && speed < 10) {
    return 'Return to starting position';
  }

  return 'Good movement';
}

/** Is the knee currently in the second half of its travel toward target? */
function isApproachingTarget(angle: number, config: RepetitionConfig): boolean {
  const { startAngle, targetAngle } = config;
  const total = Math.abs(targetAngle - startAngle);
  if (total === 0) return false;
  const travelled = Math.abs(angle - startAngle);
  return travelled / total > 0.6;
}
