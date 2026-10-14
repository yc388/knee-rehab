import type { Exercise } from '@/types/exercise';

/**
 * The library of rehabilitation exercises.
 *
 * The whole app (selection, instructions, live analysis, scoring) is driven by
 * these definitions. To add an exercise, append an entry — nothing else needs
 * to change. Target angles and rep counts here are DEFAULTS; the user can
 * override them per session (see SessionConfig), because a single rehab target
 * is not appropriate for every patient.
 *
 * Angle convention: 0° = fully extended (straight leg); larger = more flexed.
 */
export const EXERCISES: Exercise[] = [
  {
    id: 'sit-to-stand',
    name: 'Sit-to-Stand',
    icon: '🪑',
    shortDescription: 'Rise from a chair to standing and return with control.',
    longDescription:
      'A functional exercise that mirrors everyday movement, building strength and confidence for standing up safely. The brace tracks knee flexion/extension through each transition.',
    steps: [
      'Sit towards the front of a sturdy chair, feet shoulder-width apart.',
      'Lean slightly forward and push up through your heels to stand tall.',
      'Pause briefly in the standing position.',
      'Slowly bend your knees and lower yourself back into the chair.',
    ],
    safetyReminder:
      'Use a stable, non-rolling chair and keep a support within reach. Rise and lower with control.',
    targetReps: 8,
    estimatedSeconds: 110,
    difficulty: 'Challenging',
    direction: 'extension',
    // Seated knee bent ~95°, standing nearly straight ~15°.
    repConfig: {
      startAngle: 95,
      targetAngle: 15,
      targetTolerance: 15,
      startTolerance: 15,
      minTravel: 45,
      maxControlledSpeed: 130,
    },
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    icon: '🦵',
    shortDescription: 'Straighten the lower leg from a bent-knee start.',
    longDescription:
      'A seated exercise that strengthens the quadriceps and improves active knee extension. The brace measures how far you straighten and how controlled the return is.',
    steps: [
      'Sit upright on a chair with both feet flat on the floor.',
      'Slowly extend your knee until your leg is nearly straight.',
      'Hold the straightened position briefly.',
      'Slowly lower your leg back to the starting position.',
    ],
    safetyReminder:
      'Move slowly and stop if you feel sharp pain. Keep your back supported against the chair.',
    targetReps: 10,
    estimatedSeconds: 95,
    difficulty: 'Easy',
    direction: 'extension',
    // Sitting: knee bent ~90°, extending straightens toward ~20°.
    repConfig: {
      startAngle: 90,
      targetAngle: 20,
      targetTolerance: 15,
      startTolerance: 15,
      minTravel: 40,
      maxControlledSpeed: 110,
    },
  },
  {
    id: 'squat',
    name: 'Squat',
    icon: '🏋️',
    shortDescription: 'Bend the knees to lower, then return to standing.',
    longDescription:
      'A compound exercise building lower-limb strength. The brace tracks knee flexion depth and the control of your descent and ascent.',
    steps: [
      'Stand tall with feet shoulder-width apart, support nearby.',
      'Bend your knees to lower your body towards a comfortable depth.',
      'Pause briefly at the bottom of the movement.',
      'Push through your feet to return to standing.',
    ],
    safetyReminder:
      'Keep support within reach and only squat to a comfortable, pain-free depth.',
    targetReps: 10,
    estimatedSeconds: 100,
    difficulty: 'Moderate',
    direction: 'flexion',
    // Standing ~10°, squatting flexes toward ~95°.
    repConfig: {
      startAngle: 10,
      targetAngle: 95,
      targetTolerance: 18,
      startTolerance: 15,
      minTravel: 45,
      maxControlledSpeed: 140,
    },
  },
  {
    id: 'hamstring-curls',
    name: 'Hamstring Curls',
    icon: '🧍',
    shortDescription: 'Flex the knee to bring the heel toward the thigh.',
    longDescription:
      'A standing exercise that improves knee flexion and hamstring activation. Hold a stable surface for balance. The brace measures peak flexion and movement smoothness.',
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
    direction: 'flexion',
    // Standing straight ~10°, curling flexes toward ~110°.
    repConfig: {
      startAngle: 10,
      targetAngle: 110,
      targetTolerance: 18,
      startTolerance: 15,
      minTravel: 50,
      maxControlledSpeed: 150,
    },
  },
  {
    id: 'lunges',
    name: 'Lunges',
    icon: '🚶',
    shortDescription: 'Step into a lunge, bend the knee, and return.',
    longDescription:
      'A functional exercise that loads the monitored knee through a controlled bend. The brace tracks the monitored knee’s flexion and the control of your descent and return.',
    steps: [
      'Stand tall, support nearby, and step one foot forward.',
      'Bend the monitored knee to lower into a lunge.',
      'Pause briefly at the bottom.',
      'Push back up and return to the starting position.',
    ],
    safetyReminder:
      'Keep support within reach. Only lunge to a comfortable depth and move with control.',
    targetReps: 10,
    estimatedSeconds: 110,
    difficulty: 'Challenging',
    direction: 'flexion',
    // Standing ~10°, lunge flexes the monitored knee toward ~90°.
    repConfig: {
      startAngle: 10,
      targetAngle: 90,
      targetTolerance: 16,
      startTolerance: 15,
      minTravel: 45,
      maxControlledSpeed: 140,
    },
  },
];

/** Look up an exercise by its id. */
export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}
