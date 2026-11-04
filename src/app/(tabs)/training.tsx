import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseAnim } from '@/components/ExerciseAnim';
import { Button, Card, Icon, PressableScale } from '@/components/ui';
import { kvGet, recentWorkouts, type WorkoutSummary } from '@/lib/db';
import { fromKey } from '@/lib/dates';
import { MONTHS, WEEKDAYS, fmt, type TKey } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { DAY_TITLES, exerciseName, type Program, type ProgramDay } from '@/lib/training';
import { colors, radius, space, type } from '@/theme';

export default function Training() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, lang, dataVersion } = useApp();
  const [program, setProgram] = useState<Program | null>(null);
  const [history, setHistory] = useState<WorkoutSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      kvGet<Program>(db, 'program').then(setProgram);
      recentWorkouts(db, 10).then(setHistory);
    }, [db, dataVersion]),
  );

  const todayIdx = (new Date().getDay() + 6) % 7; // Monday = 0
  const today = program?.days.find((d) => d.weekday === todayIdx) ?? null;
  const next = program?.days.find((d) => d.weekday > todayIdx) ?? program?.days[0] ?? null;
  const wd = (i: number) => WEEKDAYS[lang][(i + 1) % 7];

  const start = (d: ProgramDay) => router.push({ pathname: '/workout/[key]', params: { key: d.key } });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 120, paddingHorizontal: space.lg, gap: space.lg }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{t('training')}</Text>

      {!program ? (
        <Animated.View entering={FadeInDown.duration(400)}>
          <Card style={{ gap: space.lg, alignItems: 'center', paddingVertical: space.xxl }}>
            <View style={styles.heroIcon}>
              <Icon name="dumbbell.fill" size={30} color={colors.accent} />
            </View>
            <Text style={styles.intro}>{t('programIntro')}</Text>
            <Button title={t('createProgram')} icon="sparkles" onPress={() => router.push('/program-setup')} style={{ alignSelf: 'stretch' }} />
          </Card>
        </Animated.View>
      ) : (
        <>
          {/* week strip */}
          <View style={styles.week}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
              const d = program.days.find((x) => x.weekday === i);
              const isToday = i === todayIdx;
              return (
                <View key={i} style={[styles.wday, d && styles.wdayTrain, isToday && styles.wdayToday]}>
                  <Text style={[styles.wdayName, isToday && { color: colors.onAccent }]}>{wd(i)}</Text>
                  <Icon name={d ? 'dumbbell.fill' : 'moon.zzz'} size={13} color={isToday ? colors.onAccent : d ? colors.accent : colors.textFaint} />
                </View>
              );
            })}
          </View>

          {/* today */}
          <Animated.View entering={FadeInDown.duration(400)}>
            {today ? (
              <DayCard day={today} highlight onStart={() => start(today)} />
            ) : (
              <Card style={{ gap: space.sm }}>
                <Text style={styles.restTitle}>{t('restDay')}</Text>
                {next && (
                  <Text style={styles.meta}>
                    → {DAY_TITLES[lang][next.kind]} · {wd(next.weekday)}
                  </Text>
                )}
              </Card>
            )}
          </Animated.View>

          <Text style={styles.section}>{t('thisWeek')}</Text>
          {program.days
            .filter((d) => d !== today)
            .map((d, i) => (
              <Animated.View key={d.key} entering={FadeInDown.delay(60 * i).duration(350)}>
                <DayCard day={d} onStart={() => start(d)} />
              </Animated.View>
            ))}

          <Card style={{ gap: 6 }}>
            <Text style={styles.meta}>{t(`splitWhy_${program.split}` as TKey)}</Text>
            <Text style={styles.meta}>{fmt(t('volumeNote'), { n: program.setsPerMuscle })}</Text>
            <Text style={styles.meta}>{t('rirNote')}</Text>
            <Text style={styles.meta}>{t('progressionNote')}</Text>
          </Card>

          <Text style={styles.section}>{t('history')}</Text>
          {history.length === 0 ? (
            <Text style={styles.meta}>{t('noHistory')}</Text>
          ) : (
            <Card style={{ padding: 0 }}>
              {history.map((h, i) => {
                const d = fromKey(h.date);
                const mins = Math.max(1, Math.round((h.finished_at - h.started_at) / 60000));
                return (
                  <View key={h.id} style={[styles.histRow, i > 0 && styles.border]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.histTitle}>{DAY_TITLES[lang][h.kind as keyof (typeof DAY_TITLES)['en']] ?? h.kind}</Text>
                      <Text style={styles.meta}>
                        {d.getDate()} {MONTHS[lang][d.getMonth()]} · {mins} {t('minutesShort')} · {h.sets} {t('setsDone')}
                      </Text>
                    </View>
                    <Text style={styles.histVol}>{Math.round(h.volume)} kg</Text>
                  </View>
                );
              })}
            </Card>
          )}

          <Button title={t('rebuild')} variant="ghost" icon="arrow.triangle.2.circlepath" onPress={() => router.push('/program-setup')} />
        </>
      )}
    </ScrollView>
  );
}

function DayCard({ day, highlight, onStart }: { day: ProgramDay; highlight?: boolean; onStart: () => void }) {
  const { t, lang } = useApp();
  const wd = WEEKDAYS[lang][(day.weekday + 1) % 7];
  return (
    <Card style={[{ padding: 0 }, highlight && { borderColor: colors.accent, borderWidth: 1.5 }]}>
      <View style={styles.dayHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dayKicker}>{highlight ? (lang === 'az' ? 'BUGÜN' : 'TODAY') : wd.toUpperCase()}</Text>
          <Text style={styles.dayTitle}>{DAY_TITLES[lang][day.kind]}</Text>
        </View>
        <Text style={styles.meta}>{day.exercises.length} ×</Text>
      </View>
      {day.exercises.map((e, i) => (
        <PressableScale
          key={e.id}
          onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: e.id } })}
          scaleTo={0.98}
          style={[styles.exRow, i > 0 && styles.border]}
        >
          <ExerciseAnim id={e.id} still style={styles.thumb} />
          <Text style={styles.exName} numberOfLines={1}>
            {exerciseName(e.id, lang)}
          </Text>
          <Text style={styles.exScheme}>
            {e.sets}×{e.repMin}–{e.repMax}
          </Text>
        </PressableScale>
      ))}
      <View style={{ padding: space.lg, paddingTop: space.sm }}>
        <Button title={t('startWorkout')} icon="play.fill" variant={highlight ? 'primary' : 'secondary'} onPress={onStart} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, fontSize: 34, color: colors.text, paddingHorizontal: space.sm },
  heroIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  intro: { color: colors.textDim, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  week: { flexDirection: 'row', gap: 6 },
  wday: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface },
  wdayTrain: { backgroundColor: colors.surfaceHigh },
  wdayToday: { backgroundColor: colors.accent },
  wdayName: { color: colors.textDim, fontSize: 11, fontWeight: '700' },
  restTitle: { ...type.h2, color: colors.text },
  section: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: space.sm },
  meta: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  dayHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm },
  dayKicker: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  dayTitle: { ...type.h2, color: colors.text, marginTop: 2 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 10 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  exName: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
  exScheme: { color: colors.textDim, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  histRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md },
  histTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  histVol: { color: colors.text, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
