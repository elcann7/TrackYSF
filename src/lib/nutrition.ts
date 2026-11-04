export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
export type Goal = 'lose' | 'maintain' | 'gain';

export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
}

export interface Targets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

const GOAL_DELTA: Record<Goal, number> = { lose: -450, maintain: 0, gain: 400 };
const PROTEIN_PER_KG: Record<Goal, number> = { lose: 2.2, maintain: 1.8, gain: 2.2 };

/** Mifflin-St Jeor BMR. */
export function bmr(p: Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function tdee(p: Profile): number {
  return bmr(p) * ACTIVITY_FACTOR[p.activity];
}

export function computeTargets(p: Profile): Targets {
  const kcal = roundTo(tdee(p) + GOAL_DELTA[p.goal], 10);
  const protein = Math.round(p.weightKg * PROTEIN_PER_KG[p.goal]);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce<Macros>(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

export function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Weekly weight trend (kg/week) via least squares over the given points.
 * Returns null when there isn't enough data (fewer than 3 points or < 7 days span).
 */
export function weeklyTrend(points: { date: string; kg: number }[]): number | null {
  if (points.length < 3) return null;
  const xs = points.map((p) => new Date(p.date + 'T12:00:00').getTime() / 86_400_000);
  const span = Math.max(...xs) - Math.min(...xs);
  if (span < 7) return null;
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = points.reduce((a, p) => a + p.kg, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (points[i].kg - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? null : (num / den) * 7;
}
