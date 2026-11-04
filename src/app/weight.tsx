import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RulerPicker } from '@/components/Ruler';
import { Button, haptic } from '@/components/ui';
import { allWeights, setWeight } from '@/lib/db';
import { todayKey } from '@/lib/dates';
import { useApp } from '@/lib/store';
import { colors, space, type } from '@/theme';

export default function WeightSheet() {
  const db = useSQLiteContext();
  const { t, profile, bump } = useApp();
  const [initial, setInitial] = useState<number | null>(null);
  const [kg, setKg] = useState(0);

  useEffect(() => {
    allWeights(db).then((w) => {
      const v = w.length ? w[w.length - 1].kg : profile?.weightKg ?? 65;
      setInitial(v);
      setKg(v);
    });
  }, [db, profile]);

  const save = async () => {
    await setWeight(db, todayKey(), kg);
    haptic.success();
    bump();
    router.back();
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t('logWeight')}</Text>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {initial !== null && (
          // ±15 kg window around the last weigh-in keeps the 0.1 kg ruler light (~300 ticks)
          <RulerPicker
            min={Math.max(30, Math.round(initial) - 15)}
            max={Math.round(initial) + 15}
            step={0.1}
            decimals={1}
            majorEvery={10}
            value={initial}
            unit={t('kg')}
            onChange={setKg}
          />
        )}
      </View>
      <View style={{ paddingHorizontal: space.xl, paddingBottom: space.xl }}>
        <Button title={t('save')} icon="checkmark" onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: space.xxl },
  title: { ...type.h2, color: colors.text, textAlign: 'center' },
});
