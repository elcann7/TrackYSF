import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import type { SFSymbol } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ring } from '@/components/CalorieRing';
import { Odometer, RulerPicker } from '@/components/Ruler';
import { Button, Icon, PressableScale, Segmented, haptic } from '@/components/ui';
import { setWeight } from '@/lib/db';
import { todayKey } from '@/lib/dates';
import { MONTHS, fmt, type TKey } from '@/lib/i18n';
import {
  assessPace,
  computeTargets,
  exerciseKcalPerDay,
  type Experience,
  type Goal,
  type Lifestyle,
  type Pace,
  type Profile,
  type Sex,
} from '@/lib/nutrition';
import { useApp } from '@/lib/store';
import { colors, radius, space, type } from '@/theme';

const ALL_STEPS = [
  'welcome',
  'sex',
  'age',
  'height',
  'weight',
  'bodyfat',
  'lifestyle',
  'training',
  'experience',
  'goal',
  'target',
  'pace',
  'plan',
] as const;
type Step = (typeof ALL_STEPS)[number];

/** Sensible starting target + timeframe when a goal is picked. */
function withGoalDefaults(p: Profile, goal: Goal): Profile {
  if (goal === 'maintain') return { ...p, goal, targetKg: undefined, months: undefined };
  const delta = goal === 'lose' ? -Math.max(2, Math.round(p.weightKg * 0.08)) : Math.max(3, Math.round(p.weightKg * 0.1));
  const targetKg = Math.max(35, Math.round((p.weightKg + delta) * 2) / 2);
  const draft: Profile = { ...p, goal, targetKg, months: 6 };
  const pace = assessPace(draft);
  return { ...draft, months: pace ? pace.suggestedMonths : 6 };
}

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, lang, setLang, saveProfile, profile: existing } = useApp();
  // When a profile already exists this screen is used for editing (route /profile): skip the welcome step.
  const editing = !!existing;
  const [i, setI] = useState(editing ? 1 : 0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [p, setP] = useState<Profile>(
    existing ?? {
      sex: 'male',
      age: 20,
      heightCm: 172,
      weightKg: 65,
      goal: 'maintain',
      lifestyle: 'desk',
      trainingDays: 3,
      sessionMin: 60,
      experience: 'beginner',
      bodyFat: null,
    },
  );
  const STEPS = useMemo<Step[]>(
    () => ALL_STEPS.filter((s) => p.goal !== 'maintain' || (s !== 'target' && s !== 'pace')),
    [p.goal],
  );
  const step: Step = STEPS[Math.min(i, STEPS.length - 1)];
  const targets = useMemo(() => computeTargets(p), [p]);
  const pace = useMemo(() => assessPace(p), [p]);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(i / (STEPS.length - 1), { damping: 20, stiffness: 140 });
  }, [i, progress, STEPS.length]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const next = () => {
    // target missing, or no longer on the right side of the (possibly edited) current weight → reset it
    const badTarget =
      p.targetKg == null || (p.goal === 'lose' ? p.targetKg >= p.weightKg : p.targetKg <= p.weightKg);
    if (step === 'goal' && p.goal !== 'maintain' && badTarget) setP(withGoalDefaults(p, p.goal));
    setDir(1);
    setI((x) => Math.min(STEPS.length - 1, x + 1));
  };
  const back = () => {
    if (editing && i <= 1) {
      router.back();
      return;
    }
    setDir(-1);
    setI((x) => Math.max(0, x - 1));
  };

  const finish = async () => {
    haptic.success();
    await setWeight(db, todayKey(), p.weightKg);
    await saveProfile(p, targets);
    if (editing) router.back();
    else router.replace('/');
  };

  const entering = (dir === 1 ? FadeInRight : FadeInLeft).duration(380).springify().damping(18);
  const exiting = (dir === 1 ? FadeOutLeft : FadeOutRight).duration(180);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      {step !== 'welcome' && (
        <View style={styles.topBar}>
          <PressableScale onPress={back} style={styles.backBtn}>
            <Icon name="chevron.left" size={18} color={colors.text} weight="semibold" />
          </PressableScale>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, barStyle]} />
          </View>
          <View style={{ width: 40 }} />
        </View>
      )}

      <Animated.View key={step} entering={entering} exiting={exiting} style={{ flex: 1 }}>
        {step === 'welcome' && (
          <View style={styles.welcome}>
            <Animated.View entering={FadeIn.duration(700)} style={styles.logoMark}>
              <Ring size={120} stroke={10} progress={0.72} color={colors.accent}>
                <Icon name="fork.knife" size={36} color={colors.text} />
              </Ring>
            </Animated.View>
            <Animated.Text entering={FadeInDown.delay(150).duration(600)} style={styles.brand}>
              TrackYSF
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(250).duration(600)} style={styles.welcomeTitle}>
              {t('welcomeTitle')}
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(350).duration(600)} style={styles.welcomeSub}>
              {t('welcomeSub')}
            </Animated.Text>
            <Animated.View entering={FadeInDown.delay(450).duration(600)} style={{ width: '100%', marginTop: space.xxl }}>
              <Text style={styles.smallLabel}>{t('chooseLanguage')}</Text>
              <Segmented
                options={[
                  { value: 'az', label: 'Azərbaycanca' },
                  { value: 'en', label: 'English' },
                ]}
                value={lang}
                onChange={(v) => setLang(v)}
              />
            </Animated.View>
          </View>
        )}

        {step === 'sex' && (
          <Question title={t('sexQ')} sub={t('sexSub')}>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              {(['male', 'female'] as Sex[]).map((s) => (
                <ChoiceCard
                  key={s}
                  big
                  icon={s === 'male' ? 'figure.stand' : 'figure.stand.dress'}
                  title={t(s)}
                  selected={p.sex === s}
                  onPress={() => setP({ ...p, sex: s })}
                />
              ))}
            </View>
          </Question>
        )}

        {step === 'age' && (
          <Question title={t('ageQ')} sub={t('sliderHint')} fullBleed>
            <RulerPicker min={13} max={90} value={p.age} majorEvery={5} unit={t('years')} onChange={(v) => setP((x) => ({ ...x, age: v }))} />
          </Question>
        )}

        {step === 'height' && (
          <Question title={t('heightQ')} sub={t('sliderHint')} fullBleed>
            <RulerPicker min={120} max={220} value={p.heightCm} majorEvery={10} unit={t('cm')} onChange={(v) => setP((x) => ({ ...x, heightCm: v }))} />
          </Question>
        )}

        {step === 'weight' && (
          <Question title={t('weightQ')} sub={t('sliderHint')} fullBleed>
            <RulerPicker
              min={30}
              max={180}
              step={0.5}
              decimals={1}
              value={p.weightKg}
              majorEvery={10}
              unit={t('kg')}
              onChange={(v) => setP((x) => ({ ...x, weightKg: v }))}
            />
          </Question>
        )}

        {step === 'lifestyle' && (
          <Question title={t('lifestyleQ')} sub={t('lifestyleSub')}>
            <ScrollView contentContainerStyle={{ gap: space.sm }} showsVerticalScrollIndicator={false}>
              {(
                [
                  ['desk', 'laptopcomputer'],
                  ['mixed', 'figure.walk'],
                  ['onFeet', 'figure.walk.motion'],
                  ['physical', 'hammer.fill'],
                ] as [Lifestyle, SFSymbol][]
              ).map(([a, icon], idx) => (
                <Animated.View key={a} entering={FadeInDown.delay(60 * idx).duration(400)}>
                  <ChoiceCard
                    icon={icon}
                    title={t(`life_${a}` as TKey)}
                    desc={t(`life_${a}_d` as TKey)}
                    selected={p.lifestyle === a}
                    onPress={() => setP({ ...p, lifestyle: a })}
                  />
                </Animated.View>
              ))}
            </ScrollView>
          </Question>
        )}

        {step === 'training' && (
          <Question title={t('trainingQ')} sub={t('trainingSub')}>
            <Text style={styles.smallLabel}>{t('daysPerWeek')}</Text>
            <View style={styles.dayRow}>
              {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                <PressableScale
                  key={n}
                  onPress={() => {
                    haptic.select();
                    setP({ ...p, trainingDays: n });
                  }}
                  hapticOnPress={false}
                  style={[styles.dayChip, p.trainingDays === n && styles.dayChipSel]}
                >
                  <Text style={[styles.dayChipText, p.trainingDays === n && { color: colors.onAccent }]}>{n}</Text>
                </PressableScale>
              ))}
            </View>
            {p.trainingDays > 0 && (
              <Animated.View entering={FadeIn.duration(250)} style={{ marginTop: space.xl }}>
                <Text style={styles.smallLabel}>{t('sessionLength')}</Text>
                <Segmented
                  options={[30, 45, 60, 75, 90].map((m) => ({ value: String(m), label: `${m}′` }))}
                  value={String(p.sessionMin)}
                  onChange={(v) => setP({ ...p, sessionMin: Number(v) })}
                />
              </Animated.View>
            )}
            <Text style={[styles.qSub, { marginTop: space.xl }]}>
              {fmt(t('trainingKcalNote'), { n: Math.round(exerciseKcalPerDay(p)) })}
            </Text>
          </Question>
        )}

        {step === 'experience' && (
          <Question title={t('experienceQ')} sub={t('experienceSub')}>
            <View style={{ gap: space.sm }}>
              {(
                [
                  ['beginner', 'leaf'],
                  ['intermediate', 'chart.line.uptrend.xyaxis'],
                  ['advanced', 'trophy'],
                ] as [Experience, SFSymbol][]
              ).map(([x, icon], idx) => (
                <Animated.View key={x} entering={FadeInDown.delay(70 * idx).duration(400)}>
                  <ChoiceCard
                    icon={icon}
                    title={t(`exp_${x}` as TKey)}
                    desc={t(`exp_${x}_d` as TKey)}
                    selected={p.experience === x}
                    onPress={() => setP({ ...p, experience: x })}
                  />
                </Animated.View>
              ))}
            </View>
          </Question>
        )}

        {step === 'bodyfat' && (
          <Question title={t('bodyFatQ')} sub={t('bodyFatSub')} fullBleed>
            {p.bodyFat != null ? (
              <RulerPicker
                min={4}
                max={50}
                value={p.bodyFat}
                majorEvery={5}
                unit="%"
                onChange={(v) => setP((x) => ({ ...x, bodyFat: v }))}
              />
            ) : null}
            <View style={{ paddingHorizontal: space.xl, marginTop: space.xl }}>
              <Segmented
                options={[
                  { value: 'no', label: t('bodyFatUnknown') },
                  { value: 'yes', label: t('bodyFatKnown') },
                ]}
                value={p.bodyFat != null ? 'yes' : 'no'}
                onChange={(v) => setP({ ...p, bodyFat: v === 'yes' ? (p.sex === 'male' ? 18 : 28) : null })}
              />
            </View>
          </Question>
        )}

        {step === 'goal' && (
          <Question title={t('goalQ')}>
            <View style={{ gap: space.sm }}>
              {(
                [
                  ['lose', 'arrow.down.right'],
                  ['maintain', 'equal'],
                  ['gain', 'arrow.up.right'],
                ] as [Goal, SFSymbol][]
              ).map(([g, icon], idx) => (
                <Animated.View key={g} entering={FadeInDown.delay(70 * idx).duration(400)}>
                  <ChoiceCard
                    icon={icon}
                    title={t(`goal_${g}` as TKey)}
                    desc={t(`goal_${g}_d` as TKey)}
                    selected={p.goal === g}
                    onPress={() => setP(p.goal === g && p.targetKg != null ? p : withGoalDefaults(p, g))}
                  />
                </Animated.View>
              ))}
            </View>
          </Question>
        )}

        {step === 'target' && p.goal !== 'maintain' && (
          <Question title={t('targetQ')} sub={fmt(t('nowWeight'), { n: p.weightKg.toFixed(1) })} fullBleed>
            <RulerPicker
              key={p.goal}
              min={p.goal === 'lose' ? Math.max(30, Math.floor(p.weightKg - 60)) : Math.ceil(p.weightKg) + 1}
              max={p.goal === 'lose' ? Math.floor(p.weightKg) - 1 : Math.ceil(p.weightKg) + 60}
              step={0.5}
              decimals={1}
              majorEvery={10}
              value={p.targetKg ?? p.weightKg}
              unit={t('kg')}
              onChange={(v) => setP((x) => ({ ...x, targetKg: v }))}
            />
          </Question>
        )}

        {step === 'pace' && pace && (
          <Question title={t('paceQ')} sub={t('paceSub')}>
            <View style={{ marginHorizontal: -space.xl }}>
              <RulerPicker
                min={1}
                max={36}
                majorEvery={6}
                value={p.months ?? 6}
                unit={t('months')}
                onChange={(v) => setP((x) => ({ ...x, months: v }))}
              />
            </View>
            <PaceCard
              pace={pace}
              kcal={targets.kcal}
              onRealistic={() => {
                haptic.tap();
                setP((x) => ({ ...x, months: pace.suggestedMonths }));
              }}
            />
          </Question>
        )}

        {step === 'plan' && (
          <Question title={t('planReady')} sub={t('planSub')}>
            <PlanReveal kcal={targets.kcal} protein={targets.protein} carbs={targets.carbs} fat={targets.fat} />
          </Question>
        )}
      </Animated.View>

      <View style={styles.footer}>
        {step === 'plan' ? (
          <Button title={t('startTracking')} onPress={finish} icon="checkmark" />
        ) : (
          <Button title={step === 'welcome' ? t('getStarted') : t('continue')} onPress={next} />
        )}
      </View>
    </View>
  );
}

function Question({
  title,
  sub,
  children,
  fullBleed,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  fullBleed?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: space.xl, marginTop: space.xl, marginBottom: space.xxl }}>
        <Text style={styles.qTitle}>{title}</Text>
        {sub ? <Text style={styles.qSub}>{sub}</Text> : null}
      </View>
      <View style={[{ flex: 1 }, fullBleed ? { justifyContent: 'center', paddingBottom: 80 } : { paddingHorizontal: space.xl }]}>
        {children}
      </View>
    </View>
  );
}

function ChoiceCard({
  icon,
  title,
  desc,
  selected,
  onPress,
  big,
}: {
  icon: SFSymbol;
  title: string;
  desc?: string;
  selected: boolean;
  onPress: () => void;
  big?: boolean;
}) {
  const s = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    s.value = withTiming(selected ? 1 : 0, { duration: 220 });
  }, [selected, s]);
  const aStyle = useAnimatedStyle(() => ({
    borderColor: s.value > 0.5 ? colors.accent : colors.hairline,
    backgroundColor: s.value > 0.5 ? colors.accentSoft : colors.surface,
  }));
  return (
    <PressableScale onPress={onPress} style={big ? { flex: 1 } : undefined} scaleTo={0.97}>
      <Animated.View style={[styles.choice, big && styles.choiceBig, aStyle]}>
        <View style={[styles.choiceIcon, big && { width: 64, height: 64, borderRadius: 20 }]}>
          <Icon name={icon} size={big ? 30 : 20} color={selected ? colors.accent : colors.text} />
        </View>
        <View style={big ? { alignItems: 'center' } : { flex: 1 }}>
          <Text style={styles.choiceTitle}>{title}</Text>
          {desc ? <Text style={styles.choiceDesc}>{desc}</Text> : null}
        </View>
        {!big && (
          <View style={[styles.radio, selected && { borderColor: colors.accent }]}>
            {selected && <Animated.View entering={FadeIn.duration(150)} style={styles.radioDot} />}
          </View>
        )}
      </Animated.View>
    </PressableScale>
  );
}

function PaceCard({ pace, kcal, onRealistic }: { pace: Pace; kcal: number; onRealistic: () => void }) {
  const { t, lang } = useApp();
  const color = pace.verdict === 'realistic' ? colors.success : pace.verdict === 'aggressive' ? colors.carbs : colors.danger;
  const icon: SFSymbol =
    pace.verdict === 'realistic' ? 'checkmark.circle.fill' : pace.verdict === 'aggressive' ? 'exclamationmark.circle.fill' : 'xmark.octagon.fill';
  const w = pace.weeklyKg;
  return (
    <Animated.View key={pace.verdict} entering={FadeIn.duration(250)} style={[styles.paceCard, { borderColor: color }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name={icon} size={20} color={color} />
        <Text style={[styles.paceVerdict, { color }]}>{t(`verdict_${pace.verdict}` as TKey)}</Text>
      </View>
      <Text style={styles.paceDesc}>{t(`verdict_${pace.verdict}_d` as TKey)}</Text>
      <View style={styles.paceStats}>
        <PaceStat label={t('weeklyChange')} value={`${w >= 0 ? '+' : '−'}${Math.abs(w).toFixed(2)} ${t('kg')}`} />
        <PaceStat label={t('dailyCal')} value={`${kcal}`} />
        <PaceStat label={t('goalDate')} value={`${MONTHS[lang][pace.eta.getMonth()].slice(0, 3)} ${pace.eta.getFullYear()}`} />
      </View>
      {pace.verdict !== 'realistic' && (
        <PressableScale onPress={onRealistic} style={styles.paceFix} hapticOnPress={false}>
          <Icon name="wand.and.stars" size={16} color={colors.onAccent} />
          <Text style={styles.paceFixText}>{fmt(t('useRealistic'), { n: pace.suggestedMonths })}</Text>
        </PressableScale>
      )}
    </Animated.View>
  );
}

function PaceStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.paceStatLabel}>{label}</Text>
      <Text style={styles.paceStatValue}>{value}</Text>
    </View>
  );
}

function PlanReveal({ kcal, protein, carbs, fat }: { kcal: number; protein: number; carbs: number; fat: number }) {
  const { t } = useApp();
  const [shown, setShown] = useState({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  useEffect(() => {
    const id = setTimeout(() => setShown({ kcal, protein, carbs, fat }), 250);
    return () => clearTimeout(id);
  }, [kcal, protein, carbs, fat]);
  const macroKcal = protein * 4 + carbs * 4 + fat * 9 || 1;
  return (
    <View style={{ alignItems: 'center' }}>
      <Ring size={230} stroke={16} progress={shown.kcal ? 1 : 0} color={colors.accent}>
        <Odometer value={shown.kcal} size={52} />
        <Text style={{ color: colors.textDim, fontWeight: '600', fontSize: 15 }}>{t('kcal')} {t('perDay')}</Text>
      </Ring>
      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xxl, width: '100%' }}>
        {(
          [
            ['protein', shown.protein, colors.protein, protein * 4],
            ['carbs', shown.carbs, colors.carbs, carbs * 4],
            ['fat', shown.fat, colors.fat, fat * 9],
          ] as const
        ).map(([k, v, c, kc], idx) => (
          <Animated.View key={k} entering={FadeInDown.delay(300 + idx * 120).duration(500)} style={styles.planMacro}>
            <Ring size={64} stroke={6} progress={shown.kcal ? kc / macroKcal : 0} color={c}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, fontVariant: ['tabular-nums'] }}>{Math.round(v)}</Text>
            </Ring>
            <Text style={styles.planMacroLabel}>
              {t(k)} · {t('g')}
            </Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, gap: space.md, height: 48 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.accent },
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  logoMark: { marginBottom: space.xl },
  brand: { color: colors.accent, fontSize: 15, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase' },
  welcomeTitle: { ...type.title, fontSize: 40, color: colors.text, marginTop: space.sm, textAlign: 'center' },
  welcomeSub: { color: colors.textDim, fontSize: 17, lineHeight: 24, textAlign: 'center', marginTop: space.md },
  smallLabel: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  qTitle: { ...type.title, color: colors.text },
  qSub: { color: colors.textDim, fontSize: 16, marginTop: 6 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  choiceBig: { flexDirection: 'column', paddingVertical: space.xxl, gap: space.lg },
  choiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  choiceDesc: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.surfaceHigher,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  planMacro: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  planMacroLabel: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md },
  dayRow: { flexDirection: 'row', gap: 8 },
  dayChip: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  dayChipSel: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayChipText: { color: colors.text, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  paceCard: {
    marginTop: space.xl,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    gap: space.md,
  },
  paceVerdict: { fontSize: 17, fontWeight: '700' },
  paceDesc: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
  paceStats: { flexDirection: 'row', gap: space.md },
  paceStatLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  paceStatValue: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 3, fontVariant: ['tabular-nums'] },
  paceFix: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  paceFixText: { color: colors.onAccent, fontSize: 15, fontWeight: '700' },
});
