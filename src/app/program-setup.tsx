import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import type { SFSymbol } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseAnim } from '@/components/ExerciseAnim';
import { Button, Card, Icon, PressableScale, haptic } from '@/components/ui';
import { kvGet, kvSet } from '@/lib/db';
import { WEEKDAYS, fmt, type TKey } from '@/lib/i18n';
import { DEFAULT_REMINDERS, applyReminders, normalizeReminders, type ReminderSettings } from '@/lib/reminders';
import { computeTargets } from '@/lib/nutrition';
import { TimeField, WeekdayPicker } from '@/components/TimeField';
import { useApp } from '@/lib/store';
import {
  ALL_MUSCLES,
  DAY_TITLES,
  MUSCLE_NAMES,
  exerciseName,
  defaultWeekdays,
  generateProgram,
  type Equipment,
  type Limitation,
  type Muscle,
  type Program,
  type ProgramOptions,
  type TrainingGoal,
} from '@/lib/training';
import { colors, radius, space, type } from '@/theme';

const STEPS = ['equipment', 'days', 'goal', 'priority', 'limits', 'preview'] as const;

export default function ProgramSetup() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, lang, profile, bump, saveProfile } = useApp();
  const [trainTime, setTrainTime] = useState(DEFAULT_REMINDERS.workoutTime);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [opts, setOpts] = useState<ProgramOptions>({ equipment: 'gym', goal: 'muscle', priorities: [], limitations: [] });

  // reuse previous answers when rebuilding
  useEffect(() => {
    kvGet<Program>(db, 'program').then((p) => {
      const fallbackDays = p?.days.map((d) => d.weekday) ?? defaultWeekdays(profile?.trainingDays || 3);
      if (p?.options) setOpts({ ...p.options, weekdays: p.options.weekdays ?? fallbackDays });
      else setOpts((o) => ({ ...o, equipment: p?.equipment ?? o.equipment, weekdays: fallbackDays }));
    });
    kvGet<Partial<ReminderSettings>>(db, 'reminders').then((r) => setTrainTime(normalizeReminders(r).workoutTime));
  }, [db, profile?.trainingDays]);

  const program = useMemo(() => (profile ? generateProgram(profile, opts) : null), [profile, opts]);
  const name = STEPS[step];

  const go = (d: 1 | -1) => {
    if (d === -1 && step === 0) return router.back();
    setDir(d);
    setStep((s) => Math.max(0, Math.min(STEPS.length - 1, s + d)));
  };

  const save = async () => {
    if (!program) return;
    await kvSet(db, 'program', program);
    // the number of chosen days is the real training frequency → keep the energy model in sync
    if (profile && program.days.length !== profile.trainingDays) {
      const p2 = { ...profile, trainingDays: program.days.length };
      await saveProfile(p2, computeTargets(p2));
    }
    // reminder time + workout-day reminders follow the new schedule
    const rem = { ...normalizeReminders(await kvGet<Partial<ReminderSettings>>(db, 'reminders')), workoutTime: trainTime };
    await kvSet(db, 'reminders', rem);
    if (rem.workouts) await applyReminders(rem, lang, program.days.map((d) => d.weekday)).catch(() => {});
    haptic.success();
    bump();
    router.back();
  };

  const togglePriority = (m: Muscle) => {
    haptic.select();
    setOpts((o) => {
      const has = o.priorities.includes(m);
      if (!has && o.priorities.length >= 3) return o;
      return { ...o, priorities: has ? o.priorities.filter((x) => x !== m) : [...o.priorities, m] };
    });
  };

  const toggleLimit = (l: Limitation) => {
    haptic.select();
    setOpts((o) => ({ ...o, limitations: o.limitations.includes(l) ? o.limitations.filter((x) => x !== l) : [...o.limitations, l] }));
  };

  const wd = (i: number) => WEEKDAYS[lang][(i + 1) % 7];
  const entering = (dir === 1 ? FadeInRight : FadeInLeft).duration(300);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <PressableScale onPress={() => go(-1)} style={styles.iconBtn}>
          <Icon name={step === 0 ? 'xmark' : 'chevron.left'} size={16} color={colors.text} weight="semibold" />
        </PressableScale>
        <View style={styles.dots}>
          {STEPS.map((s, i) => (
            <View key={s} style={[styles.dot, i <= step && { backgroundColor: colors.accent }]} />
          ))}
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: insets.bottom + 120 }}>
        <Animated.View key={name} entering={entering} style={{ gap: space.lg }}>
          {name === 'equipment' && (
            <>
              <Text style={styles.q}>{t('equipmentQ')}</Text>
              {(
                [
                  ['gym', 'dumbbell.fill'],
                  ['dumbbells', 'house.fill'],
                  ['bodyweight', 'figure.core.training'],
                ] as [Equipment, SFSymbol][]
              ).map(([k, icon]) => (
                <Choice key={k} icon={icon} title={t(`eq_${k}` as TKey)} desc={t(`eq_${k}_d` as TKey)} selected={opts.equipment === k} onPress={() => setOpts({ ...opts, equipment: k })} />
              ))}
            </>
          )}

          {name === 'days' && (
            <>
              <Text style={styles.q}>{t('daysQ')}</Text>
              <Text style={styles.sub}>{t('daysSub')}</Text>
              <WeekdayPicker labels={WEEKDAYS[lang]} value={opts.weekdays ?? []} max={6} onChange={(d) => setOpts({ ...opts, weekdays: d })} />
              <Text style={styles.sub}>
                {(opts.weekdays?.length ?? 0)} {lang === 'az' ? 'gün' : 'days'} · {t('restNote')}
              </Text>
              <Card style={{ padding: 0 }}>
                <TimeField label={t('trainTime')} value={trainTime} onChange={setTrainTime} />
              </Card>
            </>
          )}

          {name === 'goal' && (
            <>
              <Text style={styles.q}>{t('tgoalQ')}</Text>
              {(
                [
                  ['muscle', 'figure.strengthtraining.traditional'],
                  ['strength', 'scalemass.fill'],
                  ['fitness', 'heart.fill'],
                ] as [TrainingGoal, SFSymbol][]
              ).map(([k, icon]) => (
                <Choice key={k} icon={icon} title={t(`tgoal_${k}` as TKey)} desc={t(`tgoal_${k}_d` as TKey)} selected={opts.goal === k} onPress={() => setOpts({ ...opts, goal: k })} />
              ))}
            </>
          )}

          {name === 'priority' && (
            <>
              <Text style={styles.q}>{t('priorityQ')}</Text>
              <Text style={styles.sub}>{t('prioritySub')}</Text>
              <View style={styles.chips}>
                {ALL_MUSCLES.map((m) => {
                  const sel = opts.priorities.includes(m);
                  const full = !sel && opts.priorities.length >= 3;
                  return (
                    <PressableScale key={m} onPress={() => togglePriority(m)} hapticOnPress={false} style={[styles.chip, sel && styles.chipSel, full && { opacity: 0.35 }]}>
                      {sel && <Icon name="checkmark" size={13} color={colors.onAccent} weight="bold" />}
                      <Text style={[styles.chipText, sel && { color: colors.onAccent }]}>{MUSCLE_NAMES[lang][m]}</Text>
                    </PressableScale>
                  );
                })}
              </View>
            </>
          )}

          {name === 'limits' && (
            <>
              <Text style={styles.q}>{t('limitQ')}</Text>
              <Text style={styles.sub}>{t('limitSub')}</Text>
              <View style={styles.chips}>
                <PressableScale
                  onPress={() => setOpts({ ...opts, limitations: [] })}
                  style={[styles.chip, opts.limitations.length === 0 && styles.chipSel]}
                >
                  <Text style={[styles.chipText, opts.limitations.length === 0 && { color: colors.onAccent }]}>{t('noneLabel')}</Text>
                </PressableScale>
                {(['knees', 'lowerBack', 'shoulders'] as Limitation[]).map((l) => {
                  const sel = opts.limitations.includes(l);
                  return (
                    <PressableScale key={l} onPress={() => toggleLimit(l)} hapticOnPress={false} style={[styles.chip, sel && styles.chipSel]}>
                      <Text style={[styles.chipText, sel && { color: colors.onAccent }]}>{t(`lim_${l}` as TKey)}</Text>
                    </PressableScale>
                  );
                })}
              </View>
            </>
          )}

          {name === 'preview' &&
            (!program ? (
              <Card>
                <Text style={styles.sub}>{t('noTraining')}</Text>
              </Card>
            ) : (
              <>
                <Card style={{ gap: 6 }}>
                  <Text style={styles.splitWhy}>{t(`splitWhy_${program.split}` as TKey)}</Text>
                  <Text style={styles.sub}>
                    {profile?.trainingDays}× / {lang === 'az' ? 'həftə' : 'week'} · {profile?.sessionMin} {t('minutesShort')} · {t(`tgoal_${opts.goal}` as TKey)}
                  </Text>
                </Card>

                <Card style={{ gap: space.sm }}>
                  <Text style={styles.section}>{t('weeklySetsTitle')}</Text>
                  {ALL_MUSCLES.map((m) => {
                    const v = program.weeklySets[m];
                    const prio = opts.priorities.includes(m);
                    return (
                      <View key={m} style={styles.volRow}>
                        <Text style={[styles.volName, prio && { color: colors.accent }]}>{MUSCLE_NAMES[lang][m]}</Text>
                        <View style={styles.volTrack}>
                          <View style={[styles.volFill, { width: `${Math.min(100, (v / 24) * 100)}%`, backgroundColor: prio ? colors.accent : colors.textDim }]} />
                        </View>
                        <Text style={styles.volNum}>{Math.round(v)}</Text>
                      </View>
                    );
                  })}
                  <Text style={styles.sub}>{fmt(t('volumeNote'), { n: program.setsPerMuscle })}</Text>
                </Card>

                {program.days.map((d, di) => (
                  <Animated.View key={d.key} entering={FadeInDown.delay(di * 60).duration(350)}>
                    <Card style={{ padding: 0 }}>
                      <View style={styles.dayHead}>
                        <Text style={styles.dayTitle}>{DAY_TITLES[lang][d.kind]}</Text>
                        <Text style={styles.dayWd}>{wd(d.weekday)}</Text>
                      </View>
                      {d.exercises.map((e, i) => (
                        <PressableScale
                          key={e.id}
                          onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: e.id } })}
                          scaleTo={0.98}
                          style={[styles.exRow, i > 0 && styles.border]}
                        >
                          <ExerciseAnim id={e.id} still style={styles.thumb} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.exName} numberOfLines={1}>
                              {exerciseName(e.id, lang)}
                            </Text>
                            {e.priority && <Text style={styles.prio}>{t('prioTag')}</Text>}
                          </View>
                          <Text style={styles.exScheme}>
                            {e.sets}×{e.repMin}–{e.repMax}
                          </Text>
                        </PressableScale>
                      ))}
                    </Card>
                  </Animated.View>
                ))}
                <Text style={styles.sub}>{t('rirNote')}</Text>
                <Text style={styles.sub}>{t('progressionNote')}</Text>
              </>
            ))}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        {name === 'preview' ? (
          <Button title={t('generate')} icon="checkmark" onPress={save} disabled={!program} />
        ) : (
          <Button title={t('continue')} onPress={() => go(1)} disabled={name === 'days' && !opts.weekdays?.length} />
        )}
      </View>
    </View>
  );
}

function Choice({ icon, title, desc, selected, onPress }: { icon: SFSymbol; title: string; desc: string; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={() => {
        haptic.select();
        onPress();
      }}
      hapticOnPress={false}
      scaleTo={0.98}
      style={[styles.choice, selected && styles.choiceSel]}
    >
      <Icon name={icon} size={20} color={selected ? colors.accent : colors.text} />
      <View style={{ flex: 1 }}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.choiceDesc}>{desc}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 22, height: 4, borderRadius: 2, backgroundColor: colors.surfaceHigher },
  q: { ...type.title, fontSize: 26, color: colors.text },
  sub: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
  section: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  choiceSel: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  choiceTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  choiceDesc: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  chipSel: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  splitWhy: { color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  volRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  volName: { width: 92, color: colors.text, fontSize: 13, fontWeight: '600' },
  volTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceHigher, overflow: 'hidden' },
  volFill: { height: '100%', borderRadius: 3 },
  volNum: { width: 26, textAlign: 'right', color: colors.text, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  dayHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  dayTitle: { ...type.h2, fontSize: 18, color: colors.text, flex: 1 },
  dayWd: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 10 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  exName: { color: colors.text, fontSize: 15, fontWeight: '500' },
  prio: { color: colors.accent, fontSize: 11, fontWeight: '800', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.6 },
  exScheme: { color: colors.textDim, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
});
