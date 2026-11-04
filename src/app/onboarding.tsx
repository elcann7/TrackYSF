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
import type { TKey } from '@/lib/i18n';
import { computeTargets, type Activity, type Goal, type Profile, type Sex } from '@/lib/nutrition';
import { useApp } from '@/lib/store';
import { colors, radius, space, type } from '@/theme';

const STEPS = ['welcome', 'sex', 'age', 'height', 'weight', 'activity', 'goal', 'plan'] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, lang, setLang, saveProfile, profile: existing } = useApp();
  // When a profile already exists this screen is used for editing (route /profile): skip the welcome step.
  const editing = !!existing;
  const [i, setI] = useState(editing ? 1 : 0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [p, setP] = useState<Profile>(
    existing ?? { sex: 'male', age: 20, heightCm: 172, weightKg: 65, activity: 'moderate', goal: 'gain' },
  );
  const step: Step = STEPS[i];
  const targets = useMemo(() => computeTargets(p), [p]);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(i / (STEPS.length - 1), { damping: 20, stiffness: 140 });
  }, [i, progress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const next = () => {
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

        {step === 'activity' && (
          <Question title={t('activityQ')}>
            <ScrollView contentContainerStyle={{ gap: space.sm }} showsVerticalScrollIndicator={false}>
              {(
                [
                  ['sedentary', 'chair.lounge'],
                  ['light', 'figure.walk'],
                  ['moderate', 'figure.strengthtraining.traditional'],
                  ['active', 'figure.run'],
                  ['athlete', 'flame'],
                ] as [Activity, SFSymbol][]
              ).map(([a, icon], idx) => (
                <Animated.View key={a} entering={FadeInDown.delay(60 * idx).duration(400)}>
                  <ChoiceCard
                    icon={icon}
                    title={t(`act_${a}` as TKey)}
                    desc={t(`act_${a}_d` as TKey)}
                    selected={p.activity === a}
                    onPress={() => setP({ ...p, activity: a })}
                  />
                </Animated.View>
              ))}
            </ScrollView>
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
                    onPress={() => setP({ ...p, goal: g })}
                  />
                </Animated.View>
              ))}
            </View>
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
});
