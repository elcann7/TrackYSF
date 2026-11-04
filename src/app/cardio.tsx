import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, PressableScale, haptic } from '@/components/ui';
import { ACTIVITIES, cardioKcal } from '@/lib/activity';
import { addCardio } from '@/lib/db';
import { todayKey } from '@/lib/dates';
import { useApp } from '@/lib/store';
import { colors, radius, space, type } from '@/theme';

const MINUTES = [10, 15, 20, 30, 45, 60, 90];

export default function Cardio() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, lang, profile, bump } = useApp();
  const params = useLocalSearchParams<{ date?: string }>();
  const [key, setKey] = useState('walkBrisk');
  const [minutes, setMinutes] = useState(30);
  const act = ACTIVITIES.find((a) => a.key === key)!;
  const kg = profile?.weightKg ?? 70;
  const kcal = cardioKcal(act.met, kg, minutes);

  const add = async () => {
    await addCardio(db, { date: params.date || todayKey(), type: key, minutes, kcal });
    haptic.success();
    bump();
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: space.xxl, gap: space.lg, paddingBottom: 140 }}>
        <Text style={styles.title}>{t('addActivity')}</Text>
        <Text style={styles.sub}>{t('cardioNote')}</Text>

        <View style={styles.grid}>
          {ACTIVITIES.map((a) => {
            const sel = a.key === key;
            return (
              <PressableScale
                key={a.key}
                onPress={() => {
                  haptic.select();
                  setKey(a.key);
                }}
                hapticOnPress={false}
                style={[styles.act, sel && styles.actSel]}
              >
                <Icon name={a.icon} size={20} color={sel ? colors.onAccent : colors.text} />
                <Text style={[styles.actText, sel && { color: colors.onAccent }]} numberOfLines={2}>
                  {lang === 'az' ? a.az : a.en}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <Text style={styles.section}>{t('duration')}</Text>
        <View style={styles.mins}>
          {MINUTES.map((m) => (
            <PressableScale
              key={m}
              onPress={() => {
                haptic.select();
                setMinutes(m);
              }}
              hapticOnPress={false}
              style={[styles.min, m === minutes && styles.minSel]}
            >
              <Text style={[styles.minText, m === minutes && { color: colors.onAccent }]}>{m}′</Text>
            </PressableScale>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <View style={styles.result}>
          <Text style={styles.kcal}>+{kcal}</Text>
          <Text style={styles.formula}>
            (MET {act.met} − 1) × {kg} kg × {minutes}′
          </Text>
        </View>
        <Button title={t('add')} icon="checkmark" onPress={add} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h2, color: colors.text },
  sub: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  section: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  act: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    minHeight: 56,
  },
  actSel: { backgroundColor: colors.accent },
  actText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
  mins: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  min: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceHigh },
  minSel: { backgroundColor: colors.accent },
  minText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, gap: space.md, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  result: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  kcal: { color: colors.text, fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
  formula: { color: colors.textDim, fontSize: 12 },
});
