import * as Notifications from 'expo-notifications';
import type { Lang } from './i18n';

/** Times are "HH:MM" (24 h). Weekdays: 0 = Monday … 6 = Sunday. */
export interface ReminderSettings {
  meals: boolean;
  mealTimes: { breakfast: string; lunch: string; dinner: string };
  weighIn: boolean;
  weighTime: string;
  weighDays: number[];
  workouts: boolean;
  /** Reminder time on training days (the training days themselves come from the program). */
  workoutTime: string;
  water: boolean;
  waterTimes: string[];
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  meals: false,
  mealTimes: { breakfast: '09:30', lunch: '14:00', dinner: '20:00' },
  weighIn: false,
  weighTime: '08:00',
  weighDays: [0, 3],
  workouts: false,
  workoutTime: '17:00',
  water: false,
  waterTimes: ['11:00', '15:00', '18:00'],
};

/** Old versions stored plain booleans only; fill in any missing fields. */
export function normalizeReminders(r: Partial<ReminderSettings> | null | undefined): ReminderSettings {
  return {
    ...DEFAULT_REMINDERS,
    ...(r ?? {}),
    mealTimes: { ...DEFAULT_REMINDERS.mealTimes, ...(r?.mealTimes ?? {}) },
    weighDays: r?.weighDays?.length ? r.weighDays : DEFAULT_REMINDERS.weighDays,
    waterTimes: r?.waterTimes?.length ? r.waterTimes : DEFAULT_REMINDERS.waterTimes,
  };
}

export function parseTime(s: string): { hour: number; minute: number } {
  const [h, m] = s.split(':').map(Number);
  return { hour: Number.isFinite(h) ? h : 9, minute: Number.isFinite(m) ? m : 0 };
}

export function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function timeToDate(s: string): Date {
  const { hour, minute } = parseTime(s);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

const TEXT: Record<Lang, Record<string, [string, string]>> = {
  en: {
    breakfast: ['Breakfast', 'Log your breakfast — snap a photo.'],
    lunch: ['Lunch', 'Don’t forget to log lunch.'],
    dinner: ['Dinner', 'Log dinner and check your protein.'],
    weigh: ['Weigh-in', 'Morning, after the bathroom, before eating.'],
    workout: ['Training today', 'Your program has a workout scheduled today.'],
    water: ['Water', 'Have a glass of water.'],
  },
  az: {
    breakfast: ['Səhər yeməyi', 'Səhər yeməyini qeyd et — şəklini çək.'],
    lunch: ['Nahar', 'Naharı qeyd etməyi unutma.'],
    dinner: ['Şam yeməyi', 'Şam yeməyini qeyd et, proteinə bax.'],
    weigh: ['Çəki ölçümü', 'Səhər, tualetdən sonra, yeməkdən əvvəl.'],
    workout: ['Bu gün məşq var', 'Proqramında bu gün məşq günüdür.'],
    water: ['Su', 'Bir stəkan su iç.'],
  },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

const daily = (time: string): Notifications.NotificationTriggerInput => ({
  type: Notifications.SchedulableTriggerInputTypes.DAILY,
  ...parseTime(time),
});

/** iOS weekday: 1 = Sunday … 7 = Saturday. */
const weekly = (weekday: number, time: string): Notifications.NotificationTriggerInput => ({
  type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
  weekday: ((weekday + 1) % 7) + 1,
  ...parseTime(time),
});

/** Cancels everything and schedules the enabled reminders again (idempotent). */
export async function applyReminders(s: ReminderSettings, lang: Lang, trainingWeekdays: number[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const tx = TEXT[lang];
  const add = (k: string, trigger: Notifications.NotificationTriggerInput) =>
    Notifications.scheduleNotificationAsync({ content: { title: tx[k][0], body: tx[k][1] }, trigger });

  if (s.meals) {
    await add('breakfast', daily(s.mealTimes.breakfast));
    await add('lunch', daily(s.mealTimes.lunch));
    await add('dinner', daily(s.mealTimes.dinner));
  }
  if (s.weighIn) for (const d of s.weighDays) await add('weigh', weekly(d, s.weighTime));
  if (s.workouts) for (const d of trainingWeekdays) await add('workout', weekly(d, s.workoutTime));
  if (s.water) for (const t of s.waterTimes) await add('water', daily(t));
}
