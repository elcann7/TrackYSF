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
  /** Target weight for lose/gain goals. */
  targetKg?: number;
  /** Months to reach the target. */
  months?: number;
}

export type PaceVerdict = 'realistic' | 'aggressive' | 'unrealistic';

export interface Pace {
  /** Planned change per week in kg (negative when losing). */
  weeklyKg: number;
  /** Daily calorie adjustment vs. maintenance. */
  dailyDelta: number;
  verdict: PaceVerdict;
  /** Months needed at a comfortable, sustainable pace. */
  suggestedMonths: number;
  /** Date the target is reached with the chosen months. */
  eta: Date;
}

const KCAL_PER_KG = 7700;
const WEEKS_PER_MONTH = 4.345;

/**
 * Evidence-based pace limits:
 * - fat loss: ≤0.75% bodyweight/week sustainable, ≤1% aggressive, more is unrealistic (muscle loss).
 * - muscle gain: ≤0.5 kg/week for beginners, ≤0.75 aggressive (mostly fat), more is unrealistic.
 */
export function assessPace(p: Profile): Pace | null {
  if (p.goal === 'maintain' || p.targetKg == null || !p.months) return null;
  const diff = p.targetKg - p.weightKg;
  const weeks = p.months * WEEKS_PER_MONTH;
  const weeklyKg = diff / weeks;
  const eta = new Date();
  eta.setDate(eta.getDate() + Math.round(weeks * 7));

  if (diff < 0) {
    // The first weeks of a deficit drop water/glycogen (~1.5% bodyweight, max 2.5 kg) at no calorie cost,
    // so only the remaining fat part is judged and needs a deficit.
    const water = Math.min(2.5, p.weightKg * 0.015, Math.abs(diff));
    const fatKg = Math.abs(diff) - water;
    const fatWeekly = fatKg / weeks;
    const pct = (fatWeekly / p.weightKg) * 100;
    // ≤1%/week is the common evidence-based ceiling for sustainable fat loss; up to 1.5% is hard but possible.
    const verdict: PaceVerdict = pct <= 1 ? 'realistic' : pct <= 1.5 ? 'aggressive' : 'unrealistic';
    const suggestedMonths = Math.max(1, Math.ceil(fatKg / (p.weightKg * 0.0085) / WEEKS_PER_MONTH));
    return { weeklyKg, dailyDelta: (-fatWeekly * KCAL_PER_KG) / 7, verdict, suggestedMonths, eta };
  }

  const abs = Math.abs(weeklyKg);
  const verdict: PaceVerdict = abs <= 0.5 ? 'realistic' : abs <= 0.75 ? 'aggressive' : 'unrealistic';
  const suggestedMonths = Math.max(1, Math.ceil(diff / 0.35 / WEEKS_PER_MONTH));
  return { weeklyKg, dailyDelta: (weeklyKg * KCAL_PER_KG) / 7, verdict, suggestedMonths, eta };
}

/** Lowest daily intake the app will ever suggest. */
export function calorieFloor(p: Profile): number {
  return Math.max(p.sex === 'male' ? 1500 : 1200, Math.round(bmr(p) * 0.8));
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
const PROTEIN_PER_KG: Record<Goal, number> = { lose: 2.0, maintain: 1.8, gain: 2.2 };

/** Mifflin-St Jeor BMR. */
export function bmr(p: Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function tdee(p: Profile): number {
  return bmr(p) * ACTIVITY_FACTOR[p.activity];
}

export function computeTargets(p: Profile): Targets {
  const pace = assessPace(p);
  // Chosen pace drives the deficit/surplus, but never beyond ±1000 kcal or below a safe floor.
  const delta = pace ? Math.max(-1000, Math.min(1000, pace.dailyDelta)) : GOAL_DELTA[p.goal];
  const kcal = roundTo(Math.max(calorieFloor(p), tdee(p) + delta), 10);
  // when cutting, base protein on goal weight so heavier people don't get absurd targets
  const proteinBase = p.goal === 'lose' && p.targetKg != null ? Math.min(p.weightKg, p.targetKg) : p.weightKg;
  const protein = Math.round(proteinBase * PROTEIN_PER_KG[p.goal]);
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
