import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Icon, PressableScale } from '@/components/ui';
import { allWeights, dailyTotals } from '@/lib/db';
import { addDays, todayKey } from '@/lib/dates';
import {
  LIFESTYLE_FACTOR,
  adaptiveTdee,
  ageGroup,
  assessPace,
  bmr,
  calorieFloor,
  computeTargets,
  exerciseKcalPerDay,
  gainCeilingPct,
  leanMass,
  lossCeilingPct,
  proteinPerMeal,
  tdee,
  type AdaptiveResult,
} from '@/lib/nutrition';
import { useApp } from '@/lib/store';
import { colors, space, type } from '@/theme';

export default function Science() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, lang, profile, targets } = useApp();
  const [adaptive, setAdaptive] = useState<AdaptiveResult | null>(null);
  const az = lang === 'az';

  useEffect(() => {
    (async () => {
      const from = addDays(todayKey(), -28);
      const [w, d] = await Promise.all([allWeights(db), dailyTotals(db, from, addDays(todayKey(), -1))]);
      setAdaptive(adaptiveTdee(w.filter((x) => x.date >= from), d));
    })();
  }, [db]);

  if (!profile) return null;
  const p = profile;
  const lbm = leanMass(p);
  const b = Math.round(bmr(p));
  const f = LIFESTYLE_FACTOR[p.lifestyle];
  const ex = Math.round(exerciseKcalPerDay(p));
  const formula = Math.round(tdee(p));
  const pace = assessPace(p);
  const calc = computeTargets(p);
  const g = ageGroup(p.age);

  const ageNote: Record<typeof g, string> = az
    ? {
        teen: '18 yaşdan kiçik: bədən hələ böyüyür. Arıqlama tempi ən çox 0.5%/həftə, kalori döşəməsi yüksək (BMR-dən aşağı yox). Əzələ artımına təbii böyümə də kömək edir.',
        adult: '18–39 yaş: standart model. Əzələ yığma və yağ yandırma qabiliyyəti ən yüksəkdir.',
        midlife: '40–64 yaş: əzələ artım sürəti ~15% aşağı; hər öyündə protein bir az çox (0.35 q/kq).',
        senior: '65+: əzələ zülala daha az həssasdır (anabolik rezistentlik) → protein +0.2 q/kq və hər öyündə ~0.4 q/kq; arıqlama ən çox 0.7%/həftə ki, əzələ və sümük qorunsun.',
      }
    : {
        teen: 'Under 18: still growing. Fat loss capped at 0.5%/week, higher calorie floor (never below BMR). Growth also adds lean mass.',
        adult: '18–39: standard model. Highest capacity to build muscle and lose fat.',
        midlife: '40–64: muscle-gain rate ~15% lower; slightly more protein per meal (0.35 g/kg).',
        senior: '65+: muscle responds less to protein (anabolic resistance) → +0.2 g/kg protein and ~0.4 g/kg per meal; fat loss capped at 0.7%/week to protect muscle and bone.',
      };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="xmark" size={16} color={colors.text} weight="semibold" />
        </PressableScale>
        <Text style={styles.headerTitle}>{t('science')}</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: insets.bottom + 40 }}>
        <Step
          n="1"
          title={az ? 'Bazal metabolizm (BMR)' : 'Resting metabolism (BMR)'}
          formula={
            lbm != null
              ? `Katch-McArdle: 370 + 21.6 × ${lbm.toFixed(1)} kg ${az ? 'yağsız kütlə' : 'lean mass'}`
              : `Mifflin-St Jeor: 10×${p.weightKg} + 6.25×${p.heightCm} − 5×${p.age} ${p.sex === 'male' ? '+ 5' : '− 161'}`
          }
          result={`${b} kcal`}
          note={az ? 'Yaş, cins, boy və çəki burada işlənir. Hər yaş ili BMR-i 5 kkal azaldır.' : 'Age, sex, height and weight are used here. Each year of age lowers BMR by 5 kcal.'}
        />
        <Step
          n="2"
          title={az ? 'Gündəlik həyat (NEAT)' : 'Daily life (NEAT)'}
          formula={`${b} × ${f}`}
          result={`${Math.round(b * f)} kcal`}
          note={az ? 'Məşqdən kənar hərəkət: iş, yeriş, addımlar.' : 'Movement outside training: job, walking, steps.'}
        />
        <Step
          n="3"
          title={az ? 'Məşq' : 'Training'}
          formula={`(MET 5 − 1) × ${p.weightKg} kg × ${p.trainingDays}×${p.sessionMin}′ / 7`}
          result={`+${ex} kcal`}
          note={az ? 'Ainsworth 2011 MET cədvəli; istirahət enerjisi çıxılır ki, iki dəfə sayılmasın.' : 'Ainsworth 2011 Compendium METs; resting energy is subtracted so it isn’t counted twice.'}
        />
        <Step n="=" title={az ? 'Gündəlik sərf (TDEE, düstur)' : 'Daily burn (TDEE, formula)'} formula="" result={`${formula} kcal`} />

        <Card style={{ gap: 6 }}>
          <Text style={styles.cardTitle}>{t('adaptiveTitle')}</Text>
          <Text style={styles.note}>
            {adaptive
              ? `${adaptive.days} ${az ? 'gün' : 'days'}: ${adaptive.avgIntake} kcal − (${adaptive.weeklyChange.toFixed(2)} kg/${az ? 'həftə' : 'wk'} × 7700 / 7) = ${adaptive.tdee} kcal`
              : t('adaptiveNeed')}
          </Text>
        </Card>

        {pace && (
          <Step
            n="4"
            title={az ? 'Hədəf tempi' : 'Goal pace'}
            formula={`${pace.weeklyKg >= 0 ? '+' : ''}${pace.weeklyKg.toFixed(2)} kg/${az ? 'həftə' : 'wk'} × 7700 / 7`}
            result={`${pace.dailyDelta >= 0 ? '+' : ''}${Math.round(pace.dailyDelta)} kcal`}
            note={
              p.goal === 'lose'
                ? az
                  ? `Real hədd: ${lossCeilingPct(p)}% bədən çəkisi/həftə (ilk 1–2.5 kq su ayrıca sayılır). Defisit ən çox 1000 kkal.`
                  : `Ceiling: ${lossCeilingPct(p)}% bodyweight/week (first 1–2.5 kg water counted separately). Deficit max 1000 kcal.`
                : az
                  ? `Real hədd: ${gainCeilingPct(p).toFixed(2)}% bədən çəkisi/həftə — təcrübə, cins və yaşa görə (Iraki 2019).`
                  : `Ceiling: ${gainCeilingPct(p).toFixed(2)}% bodyweight/week — by experience, sex and age (Iraki 2019).`
            }
          />
        )}
        <Step
          n="5"
          title={az ? 'Kalori hədəfi' : 'Calorie target'}
          formula={`max(${calorieFloor(p)}, ${formula} ${pace ? (pace.dailyDelta >= 0 ? '+' : '−') + ' ' + Math.abs(Math.round(Math.max(-1000, Math.min(1000, pace.dailyDelta)))) : ''})`}
          result={`${calc.kcal} kcal`}
          note={az ? `Təhlükəsiz döşəmə: ${calorieFloor(p)} kkal.` : `Safety floor: ${calorieFloor(p)} kcal.`}
        />
        <Step
          n="6"
          title={az ? 'Makrolar' : 'Macros'}
          formula={`P ${calc.protein} g · F ${calc.fat} g · C ${calc.carbs} g`}
          result=""
          note={
            az
              ? `Protein 1.6–2.2 q/kq (ISSN 2017, Morton 2018)${lbm != null ? ', yağsız kütləyə görə' : ''}. Yağ ≥0.6 q/kq (hormonlar). Qalanı karbohidrat. ${t('perMealProtein')}: ~${proteinPerMeal(p)} q.`
              : `Protein 1.6–2.2 g/kg (ISSN 2017, Morton 2018)${lbm != null ? ', based on lean mass' : ''}. Fat ≥0.6 g/kg (hormones). Rest is carbs. ${t('perMealProtein')}: ~${proteinPerMeal(p)} g.`
          }
        />
        <Card style={{ gap: 6 }}>
          <Text style={styles.cardTitle}>{az ? 'Yaşına görə' : 'For your age'}</Text>
          <Text style={styles.note}>{ageNote[g]}</Text>
        </Card>
        {targets && targets.kcal !== calc.kcal && (
          <Text style={styles.note}>
            {az ? `Hazırda istifadə olunan hədəf: ${targets.kcal} kkal (əl ilə və ya adaptiv dəyişdirilib).` : `Currently used target: ${targets.kcal} kcal (edited manually or adaptively).`}
          </Text>
        )}
        <Text style={styles.sources}>
          Mifflin MD et al. 1990 · Katch-McArdle · Ainsworth BE et al. 2011 (Compendium) · Hall KD (NIH) energy model · Helms ER 2014 · Iraki J 2019 · Jäger R 2017 (ISSN) · Morton RW 2018 · Schoenfeld BJ 2016–2017
        </Text>
      </ScrollView>
    </View>
  );
}

function Step({ n, title, formula, result, note }: { n: string; title: string; formula: string; result: string; note?: string }) {
  return (
    <Card style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={styles.num}>
          <Text style={styles.numText}>{n}</Text>
        </View>
        <Text style={[styles.cardTitle, { flex: 1 }]}>{title}</Text>
        <Text style={styles.result}>{result}</Text>
      </View>
      {formula ? <Text style={styles.formula}>{formula}</Text> : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  num: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  numText: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  cardTitle: { ...type.label, fontSize: 15, color: colors.text },
  result: { color: colors.text, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  formula: { color: colors.textDim, fontSize: 13, fontFamily: 'Menlo', lineHeight: 19 },
  note: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  sources: { color: colors.textFaint, fontSize: 11, lineHeight: 16, marginTop: space.md },
});
