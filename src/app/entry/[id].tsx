import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Segmented, haptic } from '@/components/ui';
import {
  MEALS,
  addFavorite,
  deleteEntry,
  deleteFavorite,
  getEntry,
  isFavorite,
  moveEntry,
  type Entry,
  type MealType,
} from '@/lib/db';
import { useApp } from '@/lib/store';
import { colors, radius, space, type } from '@/theme';

export default function EntryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { t, bump } = useApp();
  const [e, setE] = useState<Entry | null>(null);
  const [favId, setFavId] = useState<number | null>(null);

  useEffect(() => {
    getEntry(db, Number(id)).then(async (x) => {
      setE(x);
      if (x) setFavId(await isFavorite(db, x.name));
    });
  }, [db, id]);

  if (!e) return <View style={{ flex: 1, backgroundColor: colors.surface }} />;

  const toggleFav = async () => {
    if (favId != null) {
      await deleteFavorite(db, favId);
      setFavId(null);
    } else {
      await addFavorite(db, { name: e.name, kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat, items: e.items, thumb: e.thumb });
      setFavId(await isFavorite(db, e.name));
    }
    haptic.success();
    bump();
  };

  const onMove = async (m: MealType) => {
    setE({ ...e, meal: m });
    await moveEntry(db, e.id, m);
    bump();
  };

  const onDelete = () => {
    Alert.alert(t('deleteConfirm'), e.name, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(db, e.id);
          haptic.success();
          bump();
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: space.xl, paddingTop: space.xxl, gap: space.lg }}>
      <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
        {e.thumb ? <Image source={{ uri: `data:image/jpeg;base64,${e.thumb}` }} style={styles.thumb} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{e.name}</Text>
          <Text style={styles.kcal}>
            {Math.round(e.kcal)} <Text style={styles.unit}>{t('kcal')}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.macroRow}>
        {(
          [
            ['protein', e.protein, colors.protein],
            ['carbs', e.carbs, colors.carbs],
            ['fat', e.fat, colors.fat],
          ] as const
        ).map(([k, v, c]) => (
          <View key={k} style={styles.macro}>
            <View style={[styles.macroBar, { backgroundColor: c }]} />
            <Text style={styles.macroVal}>
              {Math.round(v)}
              <Text style={styles.unit}> {t('g')}</Text>
            </Text>
            <Text style={styles.macroLabel}>{t(k)}</Text>
          </View>
        ))}
      </View>

      {e.items.length > 0 && (
        <Card style={{ padding: 0, backgroundColor: colors.surfaceHigh }}>
          {e.items.map((it, i) => (
            <View key={i} style={[styles.item, i > 0 && styles.border]}>
              <Text style={styles.itemName} numberOfLines={2}>
                {it.name}
              </Text>
              <Text style={styles.itemG}>
                {it.grams} {t('g')}
              </Text>
              <Text style={styles.itemK}>{Math.round(it.kcal)}</Text>
            </View>
          ))}
        </Card>
      )}

      <Text style={styles.section}>{t('moveTo')}</Text>
      <Segmented options={MEALS.map((m) => ({ value: m, label: t(m) }))} value={e.meal} onChange={onMove} />

      <Button
        title={favId != null ? t('removeFavorite') : t('saveFavorite')}
        variant="secondary"
        icon={favId != null ? 'star.slash' : 'star.fill'}
        onPress={toggleFav}
        style={{ marginTop: space.md }}
      />
      <Button title={t('delete')} variant="danger" icon="trash" onPress={onDelete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  name: { ...type.h2, color: colors.text },
  kcal: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  unit: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  macroRow: { flexDirection: 'row', gap: space.md },
  macro: { flex: 1, backgroundColor: colors.surfaceHigh, borderRadius: radius.md, padding: space.md, gap: 4 },
  macroBar: { width: 24, height: 4, borderRadius: 2, marginBottom: 4 },
  macroVal: { color: colors.text, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  macroLabel: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.md },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  itemName: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
  itemG: { color: colors.textDim, fontSize: 13, fontVariant: ['tabular-nums'] },
  itemK: { color: colors.text, fontSize: 15, fontWeight: '700', width: 48, textAlign: 'right', fontVariant: ['tabular-nums'] },
  section: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
});
