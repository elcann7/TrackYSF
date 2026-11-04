import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, PressableScale, Segmented, haptic } from '@/components/ui';
import { MEALS, addEntry, deleteMyFood, type MealType } from '@/lib/db';
import { mealForNow, todayKey } from '@/lib/dates';
import { macrosFor } from '@/lib/foods';
import { fmt } from '@/lib/i18n';
import { getPickedFood } from '@/lib/selection';
import { useApp } from '@/lib/store';
import { colors, radius, space, type } from '@/theme';

export default function FoodAmount() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, bump } = useApp();
  const params = useLocalSearchParams<{ date?: string; meal?: MealType }>();
  const food = getPickedFood();
  const [meal, setMeal] = useState<MealType>(params.meal || mealForNow());

  // unit options: grams, plus each named serving
  const options = useMemo(
    () => [{ label: food?.unit ?? 'g', grams: 1 }, ...(food?.servings ?? [])],
    [food],
  );
  const [opt, setOpt] = useState(food && food.servings.length ? 1 : 0);
  const [qtyText, setQtyText] = useState(food && food.servings.length ? '1' : '100');

  if (!food) {
    return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  }

  const qty = Math.max(0, parseFloat(qtyText.replace(',', '.')) || 0);
  const grams = Math.round(qty * options[opt].grams * 10) / 10;
  const m = macrosFor(food, grams);
  const unitLabel = food.unit === 'ml' ? 'ml' : t('g');

  const step = (dir: 1 | -1) => {
    const inc = opt === 0 ? (qty >= 200 ? 25 : 10) : 0.5;
    const next = Math.max(0, Math.round((qty + dir * inc) * 10) / 10);
    setQtyText(String(next));
  };

  const add = async () => {
    if (grams <= 0) return;
    const name = food.brand ? `${food.name} (${food.brand})` : food.name;
    await addEntry(db, {
      date: params.date || todayKey(),
      meal,
      name,
      ...m,
      items: [{ name: food.name, grams, ...m }],
      thumb: null,
    });
    haptic.success();
    bump();
    router.dismissAll();
  };

  const remove = () => {
    if (!food.myId) return;
    Alert.alert(t('deleteFood'), food.name, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteMyFood(db, food.myId!);
          bump();
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: space.xl, paddingTop: space.xxl, paddingBottom: insets.bottom + space.xl, gap: space.lg }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{food.name}</Text>
          {food.brand ? <Text style={styles.brand}>{food.brand}</Text> : null}
        </View>
        {food.myId ? (
          <PressableScale onPress={remove} style={styles.iconBtn}>
            <Icon name="trash" size={16} color={colors.danger} />
          </PressableScale>
        ) : null}
      </View>

      {/* live totals */}
      <Animated.View entering={FadeIn.duration(250)} style={styles.totals}>
        <View>
          <Text style={styles.kcal}>{m.kcal}</Text>
          <Text style={styles.kcalUnit}>{t('kcal')}</Text>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <MacroLine label={t('protein')} value={m.protein} color={colors.protein} unit={t('g')} />
          <MacroLine label={t('carbs')} value={m.carbs} color={colors.carbs} unit={t('g')} />
          <MacroLine label={t('fat')} value={m.fat} color={colors.fat} unit={t('g')} />
        </View>
      </Animated.View>

      {/* amount */}
      <Text style={styles.section}>{t('amount')}</Text>
      <View style={styles.amountRow}>
        <PressableScale onPress={() => step(-1)} style={styles.stepBtn}>
          <Icon name="minus" size={16} color={colors.text} weight="bold" />
        </PressableScale>
        <TextInput
          value={qtyText}
          onChangeText={setQtyText}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={styles.qty}
        />
        <PressableScale onPress={() => step(1)} style={styles.stepBtn}>
          <Icon name="plus" size={16} color={colors.text} weight="bold" />
        </PressableScale>
      </View>
      <View style={styles.chips}>
        {options.map((o, i) => (
          <PressableScale
            key={`${o.label}-${i}`}
            onPress={() => {
              if (i === opt) return;
              haptic.select();
              // keep roughly the same amount when switching unit
              const g = grams || 100;
              setOpt(i);
              setQtyText(i === 0 ? String(Math.round(g)) : String(Math.max(0.5, Math.round((g / o.grams) * 2) / 2)));
            }}
            hapticOnPress={false}
            style={[styles.chip, i === opt && styles.chipSel]}
          >
            <Text style={[styles.chipText, i === opt && { color: colors.onAccent }]}>
              {i === 0 ? unitLabel : `${o.label} · ${o.grams}${unitLabel}`}
            </Text>
          </PressableScale>
        ))}
      </View>
      {opt !== 0 && (
        <Text style={styles.note}>
          = {grams} {unitLabel}
        </Text>
      )}

      <Text style={styles.note}>
        {fmt(t('per100'), { u: unitLabel })}: {Math.round(food.per100.kcal)} {t('kcal')} · P {food.per100.protein} · C {food.per100.carbs} · F {food.per100.fat}
        {'\n'}
        {food.source === 'online' ? t('offNote') : food.source === 'common' ? t('approxNote') : ''}
      </Text>

      <Text style={styles.section}>{t('mealLabel')}</Text>
      <Segmented options={MEALS.map((x) => ({ value: x, label: t(x) }))} value={meal} onChange={setMeal} />

      <Button title={t('addToDiary')} icon="checkmark" onPress={add} disabled={grams <= 0} style={{ marginTop: space.sm }} />
    </ScrollView>
  );
}

function MacroLine({ label, value, color, unit }: { label: string; value: number; color: string; unit: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: color }} />
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroVal}>
        {value}
        <Text style={styles.macroUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { ...type.h2, color: colors.text },
  brand: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  totals: { flexDirection: 'row', alignItems: 'center', gap: space.xl, backgroundColor: colors.surfaceHigh, borderRadius: radius.lg, padding: space.lg },
  kcal: { color: colors.text, fontSize: 44, fontWeight: '700', letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  kcalUnit: { color: colors.textDim, fontSize: 13, fontWeight: '600', marginTop: -4 },
  macroLabel: { color: colors.textDim, fontSize: 13, fontWeight: '600', flex: 1 },
  macroVal: { color: colors.text, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  macroUnit: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  section: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  qty: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surfaceHigh },
  chipSel: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  note: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
});
