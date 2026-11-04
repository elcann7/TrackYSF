import type { SFSymbol } from 'expo-symbols';
import type { Lang } from './i18n';

/**
 * Cardio / extra activity. MET values from the 2011 Compendium of Physical Activities (Ainsworth et al.).
 * Calories are NET of resting energy ((MET − 1) × kg × hours), because BMR is already in the daily target.
 * Planned strength sessions are already in the target (profile training days), so they are not logged here.
 */
export interface ActivityType {
  key: string;
  met: number;
  icon: SFSymbol;
  en: string;
  az: string;
}

export const ACTIVITIES: ActivityType[] = [
  { key: 'walk', met: 3.5, icon: 'figure.walk', en: 'Walking, moderate (~5 km/h)', az: 'Yeriş, orta (~5 km/s)' },
  { key: 'walkBrisk', met: 5.0, icon: 'figure.walk.motion', en: 'Walking, brisk (~6.4 km/h)', az: 'Sürətli yeriş (~6.4 km/s)' },
  { key: 'incline', met: 6.0, icon: 'figure.hiking', en: 'Incline walk / hiking', az: 'Maili yeriş / dağ yürüşü' },
  { key: 'run8', met: 8.3, icon: 'figure.run', en: 'Running ~8 km/h', az: 'Qaçış ~8 km/s' },
  { key: 'run10', met: 9.8, icon: 'figure.run', en: 'Running ~10 km/h', az: 'Qaçış ~10 km/s' },
  { key: 'run12', met: 11.8, icon: 'figure.run', en: 'Running ~12 km/h', az: 'Qaçış ~12 km/s' },
  { key: 'bike', met: 6.8, icon: 'figure.outdoor.cycle', en: 'Cycling, leisure (16–19 km/h)', az: 'Velosiped, rahat (16–19 km/s)' },
  { key: 'bikeHard', met: 8.0, icon: 'figure.outdoor.cycle', en: 'Cycling, moderate (19–22 km/h)', az: 'Velosiped, orta (19–22 km/s)' },
  { key: 'swim', met: 5.8, icon: 'figure.pool.swim', en: 'Swimming, moderate', az: 'Üzgüçülük, orta' },
  { key: 'football', met: 7.0, icon: 'figure.soccer', en: 'Football (casual)', az: 'Futbol (həvəskar)' },
  { key: 'basketball', met: 6.5, icon: 'figure.basketball', en: 'Basketball', az: 'Basketbol' },
  { key: 'rope', met: 11.8, icon: 'figure.jumprope', en: 'Jump rope', az: 'İp tullanma' },
  { key: 'elliptical', met: 5.0, icon: 'figure.elliptical', en: 'Elliptical, moderate', az: 'Elliptik trenajor' },
  { key: 'stairs', met: 8.8, icon: 'figure.stairs', en: 'Stair climbing', az: 'Pilləkən qalxma' },
  { key: 'dance', met: 5.0, icon: 'figure.dance', en: 'Dancing', az: 'Rəqs' },
];

export function activityName(key: string, lang: Lang): string {
  const a = ACTIVITIES.find((x) => x.key === key);
  return a ? (lang === 'az' ? a.az : a.en) : key;
}

export function cardioKcal(met: number, kg: number, minutes: number): number {
  return Math.round((met - 1) * kg * (minutes / 60));
}

/** ~35 ml per kg body weight (EFSA/NAM ranges); food supplies part of it, so this is a drink target. */
export function waterTargetMl(kg: number): number {
  return Math.round((kg * 35) / 250) * 250;
}

export const GLASS_ML = 250;
