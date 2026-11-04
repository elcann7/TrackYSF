import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalorieRing } from '@/components/CalorieRing';
import { Card, Icon, MacroBar, PressableScale, haptic } from '@/components/ui';
import { MEALS, datesWithEntries, entriesForDate, type Entry, type MealType } from '@/lib/db';
import { addDays, fromKey, todayKey } from '@/lib/dates';
import { MONTHS, WEEKDAYS } from '@/lib/i18n';
import { sumMacros } from '@/lib/nutrition';
import { useApp } from '@/lib/store';
import { colors, radius, space, type } from '@/theme';

export default function Today() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, lang, targets, dataVersion } = useApp();
  const [date, setDate] = useState(todayKey());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [marked, setMarked] = useState<Set<string>>(new Set());

  const week = useMemo(() => {
    const today = todayKey();
    return Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [e, m] = await Promise.all([entriesForDate(db, date), datesWithEntries(db, week[0], week[6])]);
        if (alive) {
          setEntries(e);
          setMarked(m);
        }
      })();
      return () => {
        alive = false;
      };
    }, [db, date, week, dataVersion]),
  );

  const totals = useMemo(() => sumMacros(entries), [entries]);
  const tg = targets ?? { kcal: 2500, protein: 120, carbs: 300, fat: 70 };

  const d = fromKey(date);
  const isToday = date === todayKey();
  const isYesterday = date === addDays(todayKey(), -1);
  const heading = isToday ? t('today') : isYesterday ? t('yesterday') : `${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;

  const openAdd = (meal?: MealType) => router.push({ pathname: '/add', params: { date, ...(meal ? { meal } : {}) } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>{`${d.getDate()} ${MONTHS[lang][d.getMonth()]}`.toUpperCase()}</Text>
            <Text style={styles.title}>{heading}</Text>
          </View>
        </View>

        {/* Week strip */}
        <View style={styles.week}>
          {week.map((k) => {
            const dd = fromKey(k);
            const sel = k === date;
            return (
              <PressableScale
                key={k}
                onPress={() => {
                  haptic.select();
                  setDate(k);
                }}
                hapticOnPress={false}
                style={[styles.day, sel && styles.daySel]}
              >
                <Text style={[styles.dayName, sel && { color: colors.onAccent }]}>{WEEKDAYS[lang][dd.getDay()]}</Text>
                <Text style={[styles.dayNum, sel && { color: colors.onAccent }]}>{dd.getDate()}</Text>
                <View style={[styles.dot, { opacity: marked.has(k) ? 1 : 0 }, sel && { backgroundColor: colors.onAccent }]} />
              </PressableScale>
            );
          })}
        </View>

        {/* Summary */}
        <Animated.View entering={FadeInDown.duration(500)} style={{ paddingHorizontal: space.lg }}>
          <Card style={styles.summary}>
            <View style={styles.summaryTop}>
              <CalorieRing eaten={totals.kcal} target={tg.kcal} leftLabel={t('remaining')} overLabel={t('over')} unit={t('kcal')} />
              <View style={styles.sideStats}>
                <Stat label={t('eaten')} value={Math.round(totals.kcal)} unit={t('kcal')} />
                <View style={styles.sep} />
                <Stat label={t('goal')} value={tg.kcal} unit={t('kcal')} />
              </View>
            </View>
            <View style={styles.macros}>
              <MacroBar label={t('protein')} value={totals.protein} target={tg.protein} color={colors.protein} unit={t('g')} />
              <MacroBar label={t('carbs')} value={totals.carbs} target={tg.carbs} color={colors.carbs} unit={t('g')} />
              <MacroBar label={t('fat')} value={totals.fat} target={tg.fat} color={colors.fat} unit={t('g')} />
            </View>
          </Card>
        </Animated.View>

        {/* Meals */}
        <View style={{ paddingHorizontal: space.lg, gap: space.md, marginTop: space.lg }}>
          {MEALS.map((meal, mi) => {
            const list = entries.filter((e) => e.meal === meal);
            const kcal = Math.round(list.reduce((a, e) => a + e.kcal, 0));
            return (
              <Animated.View key={meal} entering={FadeInDown.delay(80 + mi * 60).duration(450)} layout={LinearTransition}>
                <Card style={{ padding: 0 }}>
                  <View style={styles.mealHead}>
                    <Text style={styles.mealTitle}>{t(meal)}</Text>
                    <Text style={styles.mealKcal}>
                      {kcal > 0 ? `${kcal} ${t('kcal')}` : ''}
                    </Text>
                    <PressableScale onPress={() => openAdd(meal)} style={styles.mealAdd}>
                      <Icon name="plus" size={16} color={colors.text} weight="semibold" />
                    </PressableScale>
                  </View>
                  {list.length === 0 ? (
                    <Text style={styles.empty}>{t('emptyMeal')}</Text>
                  ) : (
                    list.map((e) => <EntryRow key={e.id} e={e} />)
                  )}
                </Card>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating add */}
      <PressableScale
        onPress={() => openAdd()}
        style={[styles.fab, { bottom: insets.bottom + 72 }]}
        scaleTo={0.9}
      >
        <Icon name="camera.fill" size={22} color={colors.onAccent} />
      </PressableScale>
    </View>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

function EntryRow({ e }: { e: Entry }) {
  const { t } = useApp();
  return (
    <PressableScale onPress={() => router.push({ pathname: '/entry/[id]', params: { id: String(e.id) } })} scaleTo={0.98} style={styles.entry}>
      {e.thumb ? (
        <Image source={{ uri: `data:image/jpeg;base64,${e.thumb}` }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Icon name="text.alignleft" size={16} color={colors.textDim} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.entryName} numberOfLines={1}>
          {e.name}
        </Text>
        <Text style={styles.entryMacros}>
          <Text style={{ color: colors.protein }}>P {Math.round(e.protein)}</Text>
          {'  '}
          <Text style={{ color: colors.carbs }}>C {Math.round(e.carbs)}</Text>
          {'  '}
          <Text style={{ color: colors.fat }}>F {Math.round(e.fat)}</Text>
        </Text>
      </View>
      <Text style={styles.entryKcal}>
        {Math.round(e.kcal)}
        <Text style={styles.statUnit}> {t('kcal')}</Text>
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.xl, marginBottom: space.lg },
  kicker: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { ...type.title, fontSize: 34, color: colors.text, marginTop: 2 },
  week: { flexDirection: 'row', paddingHorizontal: space.lg, gap: 6, marginBottom: space.lg },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: 2,
  },
  daySel: { backgroundColor: colors.accent },
  dayName: { color: colors.textFaint, fontSize: 11, fontWeight: '600' },
  dayNum: { color: colors.text, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginTop: 2 },
  summary: { padding: space.xl, gap: space.xl },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  sideStats: { flex: 1, gap: space.md },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline },
  statLabel: { color: colors.textFaint, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: 2 },
  statUnit: { color: colors.textDim, fontSize: 13, fontWeight: '500' },
  macros: { flexDirection: 'row', gap: space.lg },
  mealHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  mealTitle: { color: colors.text, fontSize: 17, fontWeight: '600', flex: 1 },
  mealKcal: { color: colors.textDim, fontSize: 14, fontWeight: '600', marginRight: space.md, fontVariant: ['tabular-nums'] },
  mealAdd: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: colors.textFaint, fontSize: 14, paddingHorizontal: space.lg, paddingBottom: space.lg },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  thumb: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.surfaceHigh },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  entryName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  entryMacros: { fontSize: 12, fontWeight: '600', marginTop: 3, fontVariant: ['tabular-nums'] },
  entryKcal: { color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  fab: {
    position: 'absolute',
    right: space.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
