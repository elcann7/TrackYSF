import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field, num } from '@/components/Field';
import { Button, Icon, PressableScale, Segmented, haptic } from '@/components/ui';
import { addMyFood } from '@/lib/db';
import { useApp } from '@/lib/store';
import { colors, space, type } from '@/theme';

export default function CreateFood() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, bump } = useApp();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [unit, setUnit] = useState<'g' | 'ml'>('g');
  const [basis, setBasis] = useState<'100' | 'serving'>('100');
  const [serving, setServing] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const u = unit === 'ml' ? 'ml' : t('g');

  const save = async () => {
    if (!name.trim()) return Alert.alert(t('needName'));
    if (!kcal.trim()) return Alert.alert(t('needKcal'));
    const servingG = num(serving);
    if (basis === 'serving' && servingG <= 0) return Alert.alert(t('servingSize'));
    // store everything per 100 g/ml
    const f = basis === 'serving' ? 100 / servingG : 1;
    await addMyFood(db, {
      name: name.trim(),
      brand: brand.trim() || null,
      unit,
      kcal: Math.round(num(kcal) * f * 10) / 10,
      protein: Math.round(num(protein) * f * 10) / 10,
      carbs: Math.round(num(carbs) * f * 10) / 10,
      fat: Math.round(num(fat) * f * 10) / 10,
      serving_label: servingG > 0 ? `1 ${t('perServing')}` : null,
      serving_g: servingG > 0 ? servingG : null,
    });
    haptic.success();
    bump();
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="xmark" size={16} color={colors.text} weight="semibold" />
        </PressableScale>
        <Text style={styles.headerTitle}>{t('createFood')}</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Field label={t('nameLabel')} value={name} onChangeText={setName} placeholder={t('namePh')} autoFocus />
        <Field label={t('brandLabel')} value={brand} onChangeText={setBrand} />

        <Segmented
          options={[
            { value: 'g', label: 'g' },
            { value: 'ml', label: 'ml' },
          ]}
          value={unit}
          onChange={setUnit}
        />

        <Text style={styles.section}>{t('valuesPer')}</Text>
        <Segmented
          options={[
            { value: '100', label: `100 ${u}` },
            { value: 'serving', label: `1 ${t('perServing')}` },
          ]}
          value={basis}
          onChange={setBasis}
        />
        <Field
          label={basis === '100' ? `${t('servingSize')} ${t('optional')}` : t('servingSize')}
          value={serving}
          onChangeText={setServing}
          keyboardType="decimal-pad"
          suffix={u}
          placeholder="250"
        />

        <Field label={t('calories')} value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" suffix={t('kcal')} dot={colors.accent} />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Field style={{ flex: 1 }} label={t('protein')} value={protein} onChangeText={setProtein} keyboardType="decimal-pad" suffix={t('g')} dot={colors.protein} />
          <Field style={{ flex: 1 }} label={t('carbs')} value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" suffix={t('g')} dot={colors.carbs} />
          <Field style={{ flex: 1 }} label={t('fat')} value={fat} onChangeText={setFat} keyboardType="decimal-pad" suffix={t('g')} dot={colors.fat} />
        </View>

        <Button title={t('saveFood')} icon="checkmark" onPress={save} style={{ marginTop: space.sm }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  section: { ...type.label, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 1 },
});
