import type { Exercise } from '@/types/exercise';

/**
 * The library of rehabilitation exercises available in the prototype.
 *
 * To add a new exercise, append an entry to this array. The rest of the app
 * (selection, instructions, live session, rep detection) is driven entirely by
 * these definitions, so no component changes are required.
 */
export const EXERCISES: Exercise[] = [
  {
    id: 'seated-knee-extension',
    name: 'Seated Knee Extension',
    icon: '🪑',
    shortDescription: 'Strengthen the front of your thigh while seated.',
    longDescription:
      'A gentle seated exercise that strengthens the quadriceps and improves knee extension. A good starting point for most rehabilitation programmes.',
    steps: [
      'Sit upright on a chair with both feet flat on the floor.',
      'Slowly extend your knee until your leg is nearly straight.',
      'Hold the straightened position briefly.',
      'Slowly lower your leg back to the starting position.',
    ],
    safetyReminder:
      'Move slowly and stop if you feel sharp pain. Keep your back supported against the chair.',
    targetReps: 10,
    estimatedSeconds: 90,
    difficulty: 'Easy',
    // Sitting: knee bent ~90°. Extending straightens it towards ~15–25°.
    repConfig: {
      startAngle: 90,
      targetAngle: 20,
      targetTolerance: 15,
      startTolerance: 15,
      minTravel: 40,
    },
  },
  {
    id: 'standing-knee-flexion',
    name: 'Standing Knee Flexion',
    icon: '🧍',
    shortDescription: 'Bend your knee backward while standing tall.',
    longDescription:
      'A standing exercise that improves knee flexion and hamstring activation. Hold onto a stable surface for balance.',
    steps: [
      'Stand tall, holding a chair or wall for balance.',
      'Slowly bend one knee, bringing your heel up towards your buttock.',
      'Hold briefly at the top of the movement.',
      'Slowly lower your foot back to the floor.',
    ],
    safetyReminder:
      'Keep your hips level and avoid swinging. Use support for balance at all times.',
    targetReps: 12,
    estimatedSeconds: 100,
    difficulty: 'Moderate',
    // Standing: leg straight ~10°. Flexing bends it towards ~110°.
    repConfig: {
      startAngle: 10,
      targetAngle: 110,
      targetTolerance: 18,
      startTolerance: 15,
      minTravel: 50,
    },
  },
  {
    id: 'sit-to-stand',
    name: 'Sit-to-Stand',
    icon: '🪑➡️🧍',
    shortDescription: 'Rise from a chair and sit back down with control.',
    longDescription:
      'A functional exercise that mirrors everyday movement, building strength and confidence for standing up safely.',
    steps: [
      'Sit towards the front of a sturdy chair, feet shoulder-width apart.',
      'Lean slightly forward and push up through your heels to stand tall.',
      'Pause briefly in the standing position.',
      'Slowly bend your knees and lower yourself back into the chair.',
    ],
    safetyReminder:
      'Use a stable, non-rolling chair. Keep a support nearby and rise with control.',
    targetReps: 8,
    estimatedSeconds: 110,
    difficulty: 'Challenging',
    // Seated knee bent ~95°, standing nearly straight ~15°.
    repConfig: {
      startAngle: 95,
      targetAngle: 15,
      targetTolerance: 15,
      startTolerance: 15,
      minTravel: 45,
    },
  },
  {
    id: 'straight-leg-raise',
    name: 'Straight Leg Raise',
    icon: '🦵',
    shortDescription: 'Lift your straight leg to build quad strength.',
    longDescription:
      'A low-impact exercise performed lying down or seated that strengthens the quadriceps without bending the knee much.',
    steps: [
      'Sit or lie down with one leg straight and the other bent.',
      'Tighten the thigh of your straight leg.',
      'Slowly raise the straight leg a short distance, keeping the knee locked.',
      'Hold briefly, then slowly lower the leg back down.',
    ],
    safetyReminder:
      'Keep the lifted leg straight and move smoothly. Avoid arching your lower back.',
    targetReps: 10,
    estimatedSeconds: 95,
    difficulty: 'Easy',
    // Knee stays fairly straight; small controlled change ~5° to ~45° as the leg lifts.
    repConfig: {
      startAngle: 5,
      targetAngle: 45,
      targetTolerance: 12,
      startTolerance: 10,
      minTravel: 20,
    },
  },
];

/** Look up an exercise by its id. */
export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}
