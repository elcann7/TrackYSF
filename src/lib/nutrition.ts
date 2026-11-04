/**
 * Energy & macro model. Every profile field below is used in at least one calculation.
 *
 * Sources (also shown in-app on the "How it's calculated" screen):
 * - BMR: Mifflin-St Jeor (1990); Katch-McArdle when body-fat % is known.
 * - Daily life (NEAT) factor applied to BMR; exercise added separately with METs
 *   (Compendium of Physical Activities, Ainsworth 2011), net of resting energy.
 * - ~7700 kcal per kg of body-weight change (Hall, NIH).
 * - Fat loss ≤1 %/week sustainable (Helms 2014, Garthe 2011); first-weeks water/glycogen drop.
 * - Weight gain rates by training age (Iraki et al. 2019): novices ~0.25–0.5 %/week.
 * - Protein 1.6–2.2 g/kg (Jäger 2017 ISSN, Morton 2018); older adults need more per meal (~0.4 g/kg).
 * - Fat ≥0.6 g/kg for hormonal health.
 */

export type Sex = 'male' | 'female';
export type Goal = 'lose' | 'maintain' | 'gain';
/** Non-exercise daily movement. */
export type Lifestyle = 'desk' | 'mixed' | 'onFeet' | 'physical';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
/** Legacy (v1 profiles) – migrated on load. */
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';

export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  lifestyle: Lifestyle;
  /** Strength/cardio sessions per week (0–7). */
  trainingDays: number;
  /** Typical session length in minutes. */
  sessionMin: number;
  experience: Experience;
  /** Optional body-fat %, enables Katch-McArdle and lean-mass protein. */
  bodyFat?: number | null;
  targetKg?: number;
  months?: number;
  /** v1 field, kept only so old profiles can be migrated. */
  activity?: Activity;
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

export type PaceVerdict = 'realistic' | 'aggressive' | 'unrealistic';

export interface Pace {
  weeklyKg: number;
  dailyDelta: number;
  verdict: PaceVerdict;
  suggestedMonths: number;
  eta: Date;
}

export const KCAL_PER_KG = 7700;
const WEEKS_PER_MONTH = 4.345;

/**
 * Physical activity level WITHOUT planned exercise (FAO/WHO/UNU 2004: sedentary PAL 1.40–1.69).
 * The common "×1.2 sedentary" multiplier is known to underestimate real expenditure.
 * Includes thermic effect of food. Planned training is added separately with METs.
 */
export const LIFESTYLE_FACTOR: Record<Lifestyle, number> = {
  desk: 1.35, // student/office, little walking (<5k steps)
  mixed: 1.45, // some walking (5–8k steps)
  onFeet: 1.6, // standing job / lots of walking (8–12k)
  physical: 1.8, // manual labour (>12k)
};

export function bmi(p: Pick<Profile, 'weightKg' | 'heightCm'>): number {
  const m = p.heightCm / 100;
  return p.weightKg / (m * m);
}

/** MET for a typical resistance session incl. rest periods (Compendium 02054/02052 mix). */
const TRAINING_MET = 5.0;

// ---------- migration ----------
export function migrateProfile(p: Profile): Profile {
  if (p.lifestyle) return p;
  const days: Record<Activity, number> = { sedentary: 0, light: 2, moderate: 4, active: 5, athlete: 6 };
  return {
    ...p,
    lifestyle: p.activity === 'athlete' ? 'mixed' : 'desk',
    trainingDays: p.activity ? days[p.activity] : 3,
    sessionMin: 60,
    experience: 'beginner',
    bodyFat: null,
  };
}

// ---------- energy ----------
export function leanMass(p: Profile): number | null {
  return p.bodyFat != null && p.bodyFat > 2 && p.bodyFat < 70 ? p.weightKg * (1 - p.bodyFat / 100) : null;
}

/** Resting energy: Katch-McArdle with known body fat, otherwise Mifflin-St Jeor (uses age & sex). */
export function bmr(p: Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg' | 'bodyFat'>): number {
  const lbm = leanMass(p as Profile);
  if (lbm != null) return 370 + 21.6 * lbm;
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

/** Extra energy of training averaged per day, net of the resting energy already in BMR. */
export function exerciseKcalPerDay(p: Profile): number {
  const hoursPerWeek = (p.trainingDays * p.sessionMin) / 60;
  return ((TRAINING_MET - 1) * p.weightKg * hoursPerWeek) / 7;
}

export function tdee(p: Profile): number {
  return bmr(p) * LIFESTYLE_FACTOR[p.lifestyle] + exerciseKcalPerDay(p);
}

// ---------- age-aware rules ----------
export type AgeGroup = 'teen' | 'adult' | 'midlife' | 'senior';
export function ageGroup(age: number): AgeGroup {
  if (age < 18) return 'teen';
  if (age < 40) return 'adult';
  if (age < 65) return 'midlife';
  return 'senior';
}

/** Lowest daily intake the app will suggest. Teens get a higher floor (growth), never below ~BMR×0.8. */
export function calorieFloor(p: Profile): number {
  const g = ageGroup(p.age);
  const sexMin = p.sex === 'male' ? 1500 : 1200;
  if (g === 'teen') return Math.max(sexMin + 300, Math.round(bmr(p)));
  return Math.max(sexMin, Math.round(bmr(p) * 0.8));
}

/** Realistic weekly gain ceiling as % of bodyweight (Iraki 2019), adjusted by sex and age. */
export function gainCeilingPct(p: Profile): number {
  const base: Record<Experience, number> = { beginner: 0.5, intermediate: 0.35, advanced: 0.2 };
  let pct = base[p.experience];
  if (p.sex === 'female') pct *= 0.8;
  const g = ageGroup(p.age);
  if (g === 'teen') pct *= 1.1; // natural growth adds lean mass
  if (g === 'midlife') pct *= 0.85;
  if (g === 'senior') pct *= 0.7;
  // underweight people restore normal tissue faster while moving toward a healthy BMI
  if (bmi(p) < 18.5) pct *= 1.3;
  return pct;
}

/** Realistic weekly fat-loss ceiling as % of bodyweight; stricter for teens and seniors (muscle/bone). */
export function lossCeilingPct(p: Profile): number {
  const g = ageGroup(p.age);
  if (g === 'teen') return 0.5;
  if (g === 'senior') return 0.7;
  return 1.0;
}

export function assessPace(p: Profile): Pace | null {
  if (p.goal === 'maintain' || p.targetKg == null || !p.months) return null;
  const diff = p.targetKg - p.weightKg;
  const weeks = p.months * WEEKS_PER_MONTH;
  const weeklyKg = diff / weeks;
  const eta = new Date();
  eta.setDate(eta.getDate() + Math.round(weeks * 7));

  if (diff < 0) {
    // First weeks of a deficit drop water/glycogen (~1.5% bodyweight, max 2.5 kg) at no calorie cost.
    const water = Math.min(2.5, p.weightKg * 0.015, Math.abs(diff));
    const fatKg = Math.abs(diff) - water;
    const fatWeekly = fatKg / weeks;
    const pct = (fatWeekly / p.weightKg) * 100;
    const ceil = lossCeilingPct(p);
    const verdict: PaceVerdict = pct <= ceil ? 'realistic' : pct <= ceil * 1.5 ? 'aggressive' : 'unrealistic';
    const comfortableKgWeek = (p.weightKg * ceil * 0.85) / 100;
    const suggestedMonths = Math.max(1, Math.ceil(fatKg / comfortableKgWeek / WEEKS_PER_MONTH));
    return { weeklyKg, dailyDelta: (-fatWeekly * KCAL_PER_KG) / 7, verdict, suggestedMonths, eta };
  }

  const pct = (weeklyKg / p.weightKg) * 100;
  const ceil = gainCeilingPct(p);
  const verdict: PaceVerdict = pct <= ceil ? 'realistic' : pct <= ceil * 1.5 ? 'aggressive' : 'unrealistic';
  const comfortableKgWeek = (p.weightKg * ceil * 0.85) / 100;
  const suggestedMonths = Math.max(1, Math.ceil(diff / comfortableKgWeek / WEEKS_PER_MONTH));
  return { weeklyKg, dailyDelta: (weeklyKg * KCAL_PER_KG) / 7, verdict, suggestedMonths, eta };
}

/** Protein g/kg by goal and age; based on lean mass when body fat is known. */
export function proteinTarget(p: Profile): number {
  const lbm = leanMass(p);
  if (lbm != null) return Math.round(lbm * (p.goal === 'lose' ? 2.4 : 2.2));
  const perKg = p.goal === 'maintain' ? 1.8 : p.goal === 'lose' ? 2.0 : 2.0;
  const g = ageGroup(p.age);
  const ageBoost = g === 'senior' ? 0.2 : 0;
  // when cutting, base on goal weight so heavier people don't get absurd numbers
  const base = p.goal === 'lose' && p.targetKg != null ? Math.min(p.weightKg, p.targetKg) : p.weightKg;
  return Math.round(base * (perKg + ageBoost));
}

/** Per-meal protein to maximise muscle protein synthesis; older muscle is less sensitive (anabolic resistance). */
export function proteinPerMeal(p: Profile): number {
  const perKg = ageGroup(p.age) === 'senior' ? 0.4 : ageGroup(p.age) === 'midlife' ? 0.35 : 0.3;
  return Math.round(p.weightKg * perKg);
}

export function computeTargets(p: Profile, tdeeOverride?: number): Targets {
  const pace = assessPace(p);
  const GOAL_DEFAULT: Record<Goal, number> = { lose: -450, maintain: 0, gain: 300 };
  const delta = pace ? Math.max(-1000, Math.min(1000, pace.dailyDelta)) : GOAL_DEFAULT[p.goal];
  const base = tdeeOverride ?? tdee(p);
  const kcal = roundTo(Math.max(calorieFloor(p), base + delta), 10);
  const protein = proteinTarget(p);
  // fat: 25% of energy but never under 0.6 g/kg
  const fat = Math.round(Math.max((kcal * 0.25) / 9, p.weightKg * 0.6));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

// ---------- helpers ----------
export function sumMacros(list: Macros[]): Macros {
  return list.reduce<Macros>(
    (a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

export function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

function dayIndex(date: string): number {
  return new Date(date + 'T12:00:00').getTime() / 86_400_000;
}

/** Exponentially smoothed weight trend (daily α≈0.1, like Hacker's Diet), one value per weigh-in. */
export function smoothWeights(points: { date: string; kg: number }[]): number[] {
  const out: number[] = [];
  let trend = points[0]?.kg ?? 0;
  let prev = points[0] ? dayIndex(points[0].date) : 0;
  for (const p of points) {
    const gap = Math.max(1, dayIndex(p.date) - prev);
    const alpha = 1 - Math.pow(0.9, gap);
    trend = out.length === 0 ? p.kg : trend + alpha * (p.kg - trend);
    out.push(trend);
    prev = dayIndex(p.date);
  }
  return out;
}

/** Weekly weight trend (kg/week) via least squares. Null with <3 points or <7 days. */
export function weeklyTrend(points: { date: string; kg: number }[]): number | null {
  if (points.length < 3) return null;
  const xs = points.map((p) => dayIndex(p.date));
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

export interface AdaptiveResult {
  tdee: number;
  days: number;
  loggedDays: number;
  avgIntake: number;
  weeklyChange: number;
}

/**
 * Adaptive TDEE from real data (energy balance): TDEE ≈ average intake − Δweight·7700/days.
 * Needs ≥14 days span, ≥4 weigh-ins and ≥10 logged days in the window.
 */
export function adaptiveTdee(
  weights: { date: string; kg: number }[],
  intake: { date: string; kcal: number }[],
): AdaptiveResult | null {
  const logged = intake.filter((d) => d.kcal >= 600); // ignore obviously incomplete days
  if (weights.length < 4 || logged.length < 10) return null;
  const weekly = weeklyTrend(weights);
  if (weekly === null) return null;
  const span = dayIndex(weights[weights.length - 1].date) - dayIndex(weights[0].date);
  if (span < 14) return null;
  const avgIntake = logged.reduce((a, d) => a + d.kcal, 0) / logged.length;
  const t = avgIntake - (weekly * KCAL_PER_KG) / 7;
  if (!Number.isFinite(t) || t < 1000 || t > 6000) return null;
  return { tdee: Math.round(t), days: Math.round(span), loggedDays: logged.length, avgIntake: Math.round(avgIntake), weeklyChange: weekly };
}
