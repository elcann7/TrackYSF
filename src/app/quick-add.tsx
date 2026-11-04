import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field, num } from '@/components/Field';
import { Button, Segmented, haptic } from '@/components/ui';
import { MEALS, addEntry, type MealType } from '@/lib/db';
import { mealForNow, todayKey } from '@/lib/dates';
import { useApp } from '@/lib/store';
import { colors, space, type } from '@/theme';

export default function QuickAdd() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, bump } = useApp();
  const params = useLocalSearchParams<{ date?: string; meal?: MealType }>();
  const [meal, setMeal] = useState<MealType>(params.meal ?? mealForNow());
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const add = async () => {
    const k = num(kcal);
    if (k <= 0) return Alert.alert(t('needKcal'));
    await addEntry(db, {
      date: params.date ?? todayKey(),
      meal,
      name: name.trim() || t('quickAddTitle'),
      kcal: Math.round(k),
      protein: num(protein),
      carbs: num(carbs),
      fat: num(fat),
      items: [],
      thumb: null,
    });
    haptic.success();
    bump();
    router.dismissAll();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: space.xl, paddingTop: space.xxl, gap: space.lg, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View>
        <Text style={styles.title}>{t('quickAddTitle')}</Text>
        <Text style={styles.sub}>{t('quickAddSub')}</Text>
      </View>
      <Field label={t('calories')} value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" suffix={t('kcal')} dot={colors.accent} autoFocus />
      <Field label={t('nameOptional')} value={name} onChangeText={setName} />
      <Text style={styles.section}>{t('macrosOptional')}</Text>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Field style={{ flex: 1 }} label={t('protein')} value={protein} onChangeText={setProtein} keyboardType="decimal-pad" suffix={t('g')} dot={colors.protein} />
        <Field style={{ flex: 1 }} label={t('carbs')} value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" suffix={t('g')} dot={colors.carbs} />
        <Field style={{ flex: 1 }} label={t('fat')} value={fat} onChangeText={setFat} keyboardType="decimal-pad" suffix={t('g')} dot={colors.fat} />
      </View>
      <Segmented options={MEALS.map((m) => ({ value: m, label: t(m) }))} value={meal} onChange={setMeal} />
      <Button title={t('add')} icon="checkmark" onPress={add} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h2, color: colors.text },
  sub: { color: colors.textDim, fontSize: 14, marginTop: 4 },
  section: { ...type.label, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 1 },
});
