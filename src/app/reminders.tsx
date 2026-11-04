import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TimeField, WeekdayPicker } from '@/components/TimeField';
import { Button, Card, Icon, PressableScale, haptic } from '@/components/ui';
import { kvGet, kvSet } from '@/lib/db';
import { WEEKDAYS } from '@/lib/i18n';
import { applyReminders, ensurePermission, normalizeReminders, sendTestNotification, type ReminderSettings } from '@/lib/reminders';
import { useApp } from '@/lib/store';
import type { Program } from '@/lib/training';
import { colors, space } from '@/theme';

export default function Reminders() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, lang } = useApp();
  const [s, setS] = useState<ReminderSettings | null>(null);
  const [trainingDays, setTrainingDays] = useState<number[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      setS(normalizeReminders(await kvGet<Partial<ReminderSettings>>(db, 'reminders')));
      const p = await kvGet<Program>(db, 'program');
      setTrainingDays(p?.days.map((d) => d.weekday) ?? []);
    })();
  }, [db]);

  // save + reschedule (debounced so scrolling a time wheel doesn't reschedule 20×)
  const update = async (patch: Partial<ReminderSettings>, needsPermission = false) => {
    if (!s) return;
    if (needsPermission && !(await ensurePermission())) {
      Alert.alert(t('remDenied'));
      return;
    }
    const next = { ...s, ...patch };
    setS(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await kvSet(db, 'reminders', next);
      await applyReminders(next, lang, trainingDays).catch(() => {});
    }, 400);
  };

  if (!s) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  const wd = WEEKDAYS[lang];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="xmark" size={16} color={colors.text} weight="semibold" />
        </PressableScale>
        <Text style={styles.headerTitle}>{t('reminders')}</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: insets.bottom + 40 }}>
        <Button
          title={t('testNotification')}
          variant="secondary"
          icon="bell.and.waves.left.and.right"
          onPress={async () => {
            const ok = await sendTestNotification(lang);
            Alert.alert(ok ? t('testNotificationSent') : t('remDenied'));
          }}
        />
        {/* meals */}
        <Card style={{ padding: 0 }}>
          <ToggleRow icon="fork.knife" label={t('remMeals')} value={s.meals} onChange={(v) => update({ meals: v }, v)} />
          <TimeField label={t('breakfast')} value={s.mealTimes.breakfast} disabled={!s.meals} onChange={(v) => update({ mealTimes: { ...s.mealTimes, breakfast: v } })} />
          <TimeField label={t('lunch')} value={s.mealTimes.lunch} disabled={!s.meals} onChange={(v) => update({ mealTimes: { ...s.mealTimes, lunch: v } })} />
          <TimeField label={t('dinner')} value={s.mealTimes.dinner} disabled={!s.meals} onChange={(v) => update({ mealTimes: { ...s.mealTimes, dinner: v } })} />
        </Card>

        {/* workouts */}
        <Card style={{ padding: 0 }}>
          <ToggleRow icon="dumbbell.fill" label={t('remWorkouts')} value={s.workouts} onChange={(v) => update({ workouts: v }, v)} />
          <TimeField label={t('remTime')} value={s.workoutTime} disabled={!s.workouts} onChange={(v) => update({ workoutTime: v })} />
          <Text style={styles.note}>
            {trainingDays.length ? `${t('remWorkoutDays')}: ${trainingDays.map((d) => wd[(d + 1) % 7]).join(', ')}` : t('remNoProgram')}
          </Text>
        </Card>

        {/* weigh-in */}
        <Card style={{ padding: 0 }}>
          <ToggleRow icon="scalemass.fill" label={t('remWeigh')} value={s.weighIn} onChange={(v) => update({ weighIn: v }, v)} />
          <TimeField label={t('remTime')} value={s.weighTime} disabled={!s.weighIn} onChange={(v) => update({ weighTime: v })} />
          <View style={{ padding: space.lg, paddingTop: space.sm, opacity: s.weighIn ? 1 : 0.4 }} pointerEvents={s.weighIn ? 'auto' : 'none'}>
            <WeekdayPicker labels={wd} value={s.weighDays} onChange={(d) => d.length > 0 && update({ weighDays: d })} />
          </View>
        </Card>

        {/* water */}
        <Card style={{ padding: 0 }}>
          <ToggleRow icon="drop.fill" label={t('remWater')} value={s.water} onChange={(v) => update({ water: v }, v)} />
          {s.waterTimes.map((time, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <TimeField
                  label={`${t('water')} ${i + 1}`}
                  value={time}
                  disabled={!s.water}
                  onChange={(v) => update({ waterTimes: s.waterTimes.map((x, k) => (k === i ? v : x)) })}
                />
              </View>
              {s.waterTimes.length > 1 && (
                <PressableScale onPress={() => update({ waterTimes: s.waterTimes.filter((_, k) => k !== i) })} style={styles.remove} hapticOnPress>
                  <Icon name="minus.circle" size={20} color={colors.textFaint} />
                </PressableScale>
              )}
            </View>
          ))}
          {s.waterTimes.length < 8 && (
            <PressableScale
              onPress={() => {
                haptic.tap();
                update({ waterTimes: [...s.waterTimes, '20:00'] });
              }}
              hapticOnPress={false}
              style={styles.addRow}
            >
              <Icon name="plus" size={14} color={colors.accent} weight="semibold" />
              <Text style={styles.addText}>{t('remAddTime')}</Text>
            </PressableScale>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

function ToggleRow({ icon, label, value, onChange }: { icon: 'fork.knife' | 'dumbbell.fill' | 'scalemass.fill' | 'drop.fill'; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <Icon name={icon} size={18} color={colors.accent} />
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.surfaceHigher }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  toggleLabel: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  note: { color: colors.textDim, fontSize: 13, paddingHorizontal: space.lg, paddingBottom: space.md },
  remove: { paddingRight: space.lg, paddingLeft: 4 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.lg, paddingVertical: space.md },
  addText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
});
