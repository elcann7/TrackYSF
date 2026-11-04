import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import type { SFSymbol } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseAnim } from '@/components/ExerciseAnim';
import { Button, Card, Icon, PressableScale, haptic } from '@/components/ui';
import { kvSet } from '@/lib/db';
import { WEEKDAYS, fmt, type TKey } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { DAY_TITLES, exerciseName, generateProgram, type Equipment } from '@/lib/training';
import { colors, radius, space, type } from '@/theme';

export default function ProgramSetup() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, lang, profile, bump } = useApp();
  const [eq, setEq] = useState<Equipment>('gym');
  const program = useMemo(() => (profile ? generateProgram(profile, eq) : null), [profile, eq]);

  const save = async () => {
    if (!program) return;
    await kvSet(db, 'program', program);
    haptic.success();
    bump();
    router.back();
  };

  // Monday-first weekday label
  const wd = (i: number) => WEEKDAYS[lang][(i + 1) % 7];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="xmark" size={16} color={colors.text} weight="semibold" />
        </PressableScale>
        <Text style={styles.headerTitle}>{t('createProgram')}</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: insets.bottom + 120 }}>
        <Text style={styles.intro}>{t('programIntro')}</Text>

        <Text style={styles.section}>{t('equipmentQ')}</Text>
        <View style={{ gap: space.sm }}>
          {(
            [
              ['gym', 'dumbbell.fill'],
              ['dumbbells', 'house.fill'],
              ['bodyweight', 'figure.core.training'],
            ] as [Equipment, SFSymbol][]
          ).map(([k, icon]) => (
            <PressableScale
              key={k}
              onPress={() => {
                haptic.select();
                setEq(k);
              }}
              hapticOnPress={false}
              scaleTo={0.98}
              style={[styles.choice, eq === k && styles.choiceSel]}
            >
              <Icon name={icon} size={20} color={eq === k ? colors.accent : colors.text} />
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceTitle}>{t(`eq_${k}` as TKey)}</Text>
                <Text style={styles.choiceDesc}>{t(`eq_${k}_d` as TKey)}</Text>
              </View>
            </PressableScale>
          ))}
        </View>

        {!program ? (
          <Card>
            <Text style={styles.intro}>{t('noTraining')}</Text>
          </Card>
        ) : (
          <>
            <Card style={{ gap: 6 }}>
              <Text style={styles.splitWhy}>{t(`splitWhy_${program.split}` as TKey)}</Text>
              <Text style={styles.meta}>
                {profile?.trainingDays}× / {lang === 'az' ? 'həftə' : 'week'} · {profile?.sessionMin} {t('minutesShort')} ·{' '}
                {fmt(t('volumeNote'), { n: program.setsPerMuscle })}
              </Text>
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
                      <Text style={styles.exName} numberOfLines={1}>
                        {exerciseName(e.id, lang)}
                      </Text>
                      <Text style={styles.exScheme}>
                        {e.sets}×{e.repMin}–{e.repMax}
                      </Text>
                    </PressableScale>
                  ))}
                </Card>
              </Animated.View>
            ))}
            <Text style={styles.note}>{t('rirNote')}</Text>
            <Text style={styles.note}>{t('progressionNote')}</Text>
          </>
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Button title={t('generate')} icon="checkmark" onPress={save} disabled={!program} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  intro: { color: colors.textDim, fontSize: 15, lineHeight: 22 },
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
  splitWhy: { color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  meta: { color: colors.textDim, fontSize: 13 },
  dayHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  dayTitle: { ...type.h2, fontSize: 18, color: colors.text, flex: 1 },
  dayWd: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 10 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  exName: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
  exScheme: { color: colors.textDim, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  note: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
});
