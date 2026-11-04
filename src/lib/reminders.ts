import * as Notifications from 'expo-notifications';
import type { Lang } from './i18n';

export interface ReminderSettings {
  meals: boolean;
  weighIn: boolean;
  workouts: boolean;
  water: boolean;
}

export const DEFAULT_REMINDERS: ReminderSettings = { meals: false, weighIn: false, workouts: false, water: false };

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

const daily = (hour: number, minute: number): Notifications.NotificationTriggerInput => ({
  type: Notifications.SchedulableTriggerInputTypes.DAILY,
  hour,
  minute,
});

/** weekday: 0 = Monday … 6 = Sunday (iOS uses 1 = Sunday). */
const weekly = (weekday: number, hour: number, minute: number): Notifications.NotificationTriggerInput => ({
  type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
  weekday: ((weekday + 1) % 7) + 1,
  hour,
  minute,
});

/** Cancels everything and schedules the enabled reminders again (idempotent). */
export async function applyReminders(s: ReminderSettings, lang: Lang, trainingWeekdays: number[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const tx = TEXT[lang];
  const add = (k: string, trigger: Notifications.NotificationTriggerInput) =>
    Notifications.scheduleNotificationAsync({ content: { title: tx[k][0], body: tx[k][1] }, trigger });

  if (s.meals) {
    await add('breakfast', daily(9, 30));
    await add('lunch', daily(14, 0));
    await add('dinner', daily(20, 0));
  }
  if (s.weighIn) {
    // 2× a week is enough for a reliable trend (Mon & Thu)
    await add('weigh', weekly(0, 8, 0));
    await add('weigh', weekly(3, 8, 0));
  }
  if (s.workouts) for (const d of trainingWeekdays) await add('workout', weekly(d, 17, 0));
  if (s.water) for (const h of [11, 15, 18]) await add('water', daily(h, 0));
}
