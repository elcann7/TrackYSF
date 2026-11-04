import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Alert } from 'react-native';
import { Button, Card, Icon, haptic } from '@/components/ui';
import { allWeights, dailyTotals, type WeightPoint } from '@/lib/db';
import { addDays, fromKey, todayKey } from '@/lib/dates';
import { MONTHS, WEEKDAYS, fmt, type TKey } from '@/lib/i18n';
import {
  adaptiveTdee,
  assessPace,
  computeTargets,
  smoothWeights,
  tdee,
  weeklyTrend,
  type AdaptiveResult,
  type Macros,
} from '@/lib/nutrition';
import { useApp } from '@/lib/store';
import { colors, radius, space, type } from '@/theme';

export default function Progress() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, lang, targets, profile, dataVersion, setTargets } = useApp();
  const [weights, setWeights] = useState<WeightPoint[]>([]);
  const [days, setDays] = useState<(Macros & { date: string })[]>([]);
  const [adaptive, setAdaptive] = useState<AdaptiveResult | null>(null);

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(todayKey(), i - 6)), []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const from28 = addDays(todayKey(), -28);
        const [w, d7, d28] = await Promise.all([
          allWeights(db),
          dailyTotals(db, week[0], week[6]),
          dailyTotals(db, from28, addDays(todayKey(), -1)), // today is still incomplete
        ]);
        setWeights(w);
        setDays(d7);
        setAdaptive(adaptiveTdee(w.filter((x) => x.date >= from28), d28));
      })();
    }, [db, week, dataVersion]),
  );

  const applyAdaptive = async () => {
    if (!adaptive || !profile) return;
    await setTargets(computeTargets(profile, adaptive.tdee));
    haptic.success();
    Alert.alert(t('targetsUpdated'));
  };

  const current = weights.at(-1)?.kg ?? profile?.weightKg ?? 0;
  const first = weights[0]?.kg ?? current;
  const change = current - first;
  const recent = weights.filter((w) => w.date >= addDays(todayKey(), -28));
  const trend = weeklyTrend(recent);

  const pace = profile ? assessPace(profile) : null;
  const planned = pace?.weeklyKg ?? 0;
  let tip: TKey = 'tipNeedData';
  if (trend !== null && profile) {
    const ok = Math.abs(trend - planned) <= Math.max(0.15, Math.abs(planned) * 0.4);
    if (ok) tip = 'tipGood';
    else if (profile.goal === 'lose') tip = trend > planned ? 'tipLoseSlow' : 'tipLoseFast';
    else tip = trend < planned ? 'tipSlow' : 'tipFast';
  }

  const logged = days.filter((d) => d.kcal > 0);
  const avgKcal = logged.length ? logged.reduce((a, d) => a + d.kcal, 0) / logged.length : 0;
  const avgProtein = logged.length ? logged.reduce((a, d) => a + d.protein, 0) / logged.length : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 120, paddingHorizontal: space.lg, gap: space.lg }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{t('progress')}</Text>

      {/* Weight */}
      <Animated.View entering={FadeInDown.duration(450)}>
        <Card style={{ gap: space.lg }}>
          <View style={styles.statsRow}>
            <Stat label={t('current')} value={current.toFixed(1)} unit={t('kg')} />
            <Stat label={t('change')} value={`${change >= 0 ? '+' : ''}${change.toFixed(1)}`} unit={t('kg')} />
            <Stat label={t('trend')} value={trend === null ? '—' : `${trend >= 0 ? '+' : ''}${trend.toFixed(2)}`} unit={trend === null ? '' : t('kg') + t('perWeek')} />
          </View>
          {pace && profile?.targetKg != null && (
            <View style={styles.goalRow}>
              <Icon name="flag.checkered" size={16} color={colors.accent} />
              <Text style={styles.goalText}>
                {t('targetWeight')}: {profile.targetKg.toFixed(1)} {t('kg')} · {MONTHS[lang][pace.eta.getMonth()]} {pace.eta.getFullYear()} ·{' '}
                {planned >= 0 ? '+' : '−'}
                {Math.abs(planned).toFixed(2)} {t('kg')}
                {t('perWeek')}
              </Text>
            </View>
          )}
          {weights.length >= 2 ? <WeightChart points={weights.slice(-30)} /> : <Text style={styles.hint}>{t('noWeights')}</Text>}
          <View style={styles.tip}>
            <Text style={styles.tipText}>{t(tip)}</Text>
          </View>
          <Button title={t('logWeight')} icon="scalemass" variant="secondary" onPress={() => router.push('/weight')} />
        </Card>
      </Animated.View>

      {/* Adaptive metabolism */}
      <Animated.View entering={FadeInDown.delay(60).duration(450)}>
        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="waveform.path.ecg" size={18} color={colors.accent} />
            <Text style={[styles.section, { flex: 1 }]}>{t('adaptiveTitle')}</Text>
            {adaptive && <Text style={styles.adaptiveBig}>{adaptive.tdee}</Text>}
          </View>
          <Text style={styles.hint}>
            {adaptive && profile
              ? fmt(t('adaptiveBody'), {
                  d: adaptive.days,
                  i: adaptive.avgIntake,
                  w: `${adaptive.weeklyChange >= 0 ? '+' : ''}${adaptive.weeklyChange.toFixed(2)}`,
                  t: adaptive.tdee,
                  f: Math.round(tdee(profile)),
                })
              : t('adaptiveNeed')}
          </Text>
          {adaptive && <Button title={t('applyAdaptive')} variant="secondary" icon="arrow.triangle.2.circlepath" onPress={applyAdaptive} />}
          <Button title={t('science')} variant="ghost" icon="function" onPress={() => router.push('/science')} />
        </Card>
      </Animated.View>

      {/* Last 7 days */}
      <Animated.View entering={FadeInDown.delay(100).duration(450)}>
        <Card style={{ gap: space.lg }}>
          <Text style={styles.section}>{t('last7')}</Text>
          <View style={styles.statsRow}>
            <Stat label={t('avgKcal')} value={String(Math.round(avgKcal))} unit={t('kcal')} />
            <Stat label={t('avgProtein')} value={String(Math.round(avgProtein))} unit={t('g')} />
          </View>
          <View style={styles.bars}>
            {week.map((k, i) => {
              const d = days.find((x) => x.date === k);
              const kcal = d?.kcal ?? 0;
              const target = targets?.kcal ?? 2500;
              return <DayBar key={k} index={i} ratio={kcal / (target * 1.25)} over={kcal > target * 1.05} label={WEEKDAYS[lang][fromKey(k).getDay()]} kcal={kcal} />;
            })}
            {/* goal line at 1/1.25 = 80% of the bar height */}
            <View pointerEvents="none" style={[styles.goalLine, { bottom: 22 + 140 * 0.8 }]} />
          </View>
        </Card>
      </Animated.View>
    </ScrollView>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

function DayBar({ ratio, label, index, over, kcal }: { ratio: number; label: string; index: number; over: boolean; kcal: number }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(index * 50, withTiming(Math.min(1, ratio), { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [ratio, index, h]);
  const aStyle = useAnimatedStyle(() => ({ height: Math.max(kcal > 0 ? 4 : 0, h.value * 140) }));
  return (
    <View style={styles.barCol}>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.bar, { backgroundColor: over ? colors.danger : colors.accent }, aStyle]} />
      </View>
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}

function WeightChart({ points }: { points: WeightPoint[] }) {
  const { width } = useWindowDimensions();
  const W = width - space.lg * 4;
  const H = 150;
  const pad = 10;
  const kgs = points.map((p) => p.kg);
  const min = Math.min(...kgs) - 0.5;
  const max = Math.max(...kgs) + 0.5;
  const t0 = fromKey(points[0].date).getTime();
  const t1 = fromKey(points[points.length - 1].date).getTime();
  const xOf = (d: string) => pad + ((fromKey(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - pad * 2);
  const yOf = (kg: number) => pad + (1 - (kg - min) / (max - min)) * (H - pad * 2);
  // line = smoothed trend (filters daily water swings); dots = actual weigh-ins
  const trendKg = smoothWeights(points);
  const raw = points.map((p) => [xOf(p.date), yOf(p.kg)] as const);
  const pts = points.map((p, i) => [xOf(p.date), yOf(trendKg[i])] as const);

  // smooth path (Catmull-Rom → Bezier)
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  const area = `${d} L ${pts[pts.length - 1][0]} ${H} L ${pts[0][0]} ${H} Z`;
  const last = pts[pts.length - 1];

  return (
    <Svg width={W} height={H}>
      <Defs>
        <LinearGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.accent} stopOpacity={0.22} />
          <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#wfill)" />
      <Path d={d} stroke={colors.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      {raw.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={2.5} fill={colors.textDim} opacity={0.6} />
      ))}
      <Circle cx={last[0]} cy={last[1]} r={5} fill={colors.bg} stroke={colors.accent} strokeWidth={2.5} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, fontSize: 34, color: colors.text, paddingHorizontal: space.sm },
  section: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', gap: space.md },
  statLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  statUnit: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  hint: { color: colors.textDim, fontSize: 14 },
  adaptiveBig: { color: colors.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalText: { flex: 1, color: colors.textDim, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  tip: { backgroundColor: colors.surfaceHigh, borderRadius: radius.md, padding: space.md },
  tipText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  bars: { flexDirection: 'row', gap: 8, height: 162, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { height: 140, width: '100%', justifyContent: 'flex-end', borderRadius: 8, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 8 },
  barLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '600' },
  goalLine: { position: 'absolute', left: 0, right: 0, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.textFaint, opacity: 0.6 },
});
