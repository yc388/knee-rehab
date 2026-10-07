import type { DifficultyLevel } from '@/types/exercise';

const CLASS: Record<DifficultyLevel, string> = {
  Easy: 'badge--easy',
  Moderate: 'badge--moderate',
  Challenging: 'badge--challenging',
};

export function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  return <span className={`badge ${CLASS[level]}`}>{level}</span>;
}
