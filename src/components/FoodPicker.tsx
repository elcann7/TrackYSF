import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import type { SFSymbol } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { allFavorites, allMyFoods, recentFoods, type Entry, type Favorite, type MealType } from '@/lib/db';
import { commonFoods, matchScore, myFoodToFood, normalize, searchOnline, type Food } from '@/lib/foods';
import { fmt } from '@/lib/i18n';
import { setPickedFood } from '@/lib/selection';
import { useApp } from '@/lib/store';
import { colors, radius, space } from '@/theme';
import { Card, Icon, PressableScale, haptic } from './ui';

/** Anything that can be re-added in one tap (a recent entry or a saved meal). */
export type QuickItem = Pick<Entry, 'name' | 'kcal' | 'protein' | 'carbs' | 'fat' | 'items' | 'thumb'> & { id: number };

export function FoodPicker({
  date,
  meal,
  onCamera,
  onLibrary,
  onDescribe,
  onRecent,
}: {
  date: string;
  meal: MealType;
  onCamera: () => void;
  onLibrary: () => void;
  onDescribe: (prefill?: string) => void;
  onRecent: (e: QuickItem) => void;
}) {
  const db = useSQLiteContext();
  const { t, lang, dataVersion } = useApp();
  const [q, setQ] = useState('');
  const [mine, setMine] = useState<Food[]>([]);
  const [recent, setRecent] = useState<Entry[]>([]);
  const [favs, setFavs] = useState<Favorite[]>([]);
  const [online, setOnline] = useState<Food[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const common = useMemo(() => commonFoods(lang), [lang]);

  useFocusEffect(
    useCallback(() => {
      allMyFoods(db).then((rows) => setMine(rows.map(myFoodToFood)));
      recentFoods(db).then(setRecent);
      allFavorites(db).then(setFavs);
    }, [db, dataVersion]),
  );

  const nq = normalize(q.trim());

  const localResults = useMemo(() => {
    if (!nq) return { mine: [], common: [] };
    const rank = (list: Food[]) =>
      list
        .map((f) => ({ f, s: matchScore(f, nq) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.f);
    return { mine: rank(mine), common: rank(common).slice(0, 12) };
  }, [nq, mine, common]);

  // online search, debounced
  useEffect(() => {
    if (nq.length < 2) {
      setOnline([]);
      setLoadingOnline(false);
      return;
    }
    const ctrl = new AbortController();
    setLoadingOnline(true);
    const id = setTimeout(() => {
      searchOnline(q.trim(), ctrl.signal)
        .then((r) => setOnline(r.slice(0, 15)))
        .catch(() => setOnline([]))
        .finally(() => setLoadingOnline(false));
    }, 450);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [nq, q]);

  const open = (f: Food) => {
    setPickedFood(f);
    router.push({ pathname: '/food-amount', params: { date, meal } });
  };

  const searching = nq.length > 0;

  return (
    <View style={{ gap: space.lg }}>
      {/* search */}
      <View style={styles.search}>
        <Icon name="magnifyingglass" size={17} color={colors.textDim} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t('searchPh')}
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {searching ? (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: space.lg }}>
          {localResults.mine.length > 0 && <FoodList title={t('myFoods')} foods={localResults.mine} onPick={open} />}
          {localResults.common.length > 0 && <FoodList title={t('commonFoods')} foods={localResults.common} onPick={open} />}
          <View style={{ gap: space.sm }}>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>{t('onlineFoods')}</Text>
              {loadingOnline && <ActivityIndicator size="small" color={colors.textDim} />}
            </View>
            {online.length > 0 ? (
              <FoodList foods={online} onPick={open} />
            ) : !loadingOnline && nq.length >= 2 ? (
              <Text style={styles.hint}>{t('noResults')}</Text>
            ) : null}
          </View>
          <PressableScale onPress={() => onDescribe(q.trim())} style={styles.aiRow} scaleTo={0.98}>
            <Icon name="sparkles" size={18} color={colors.accent} />
            <Text style={styles.aiText} numberOfLines={1}>
              {fmt(t('askAI'), { q: q.trim() })}
            </Text>
            <Icon name="chevron.right" size={14} color={colors.textFaint} />
          </PressableScale>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: space.lg }}>
          <View style={styles.tiles}>
            <Tile icon="camera.fill" label={t('camera')} primary onPress={onCamera} />
            <Tile icon="photo.on.rectangle" label={t('library')} onPress={onLibrary} />
            <Tile icon="barcode.viewfinder" label={t('scanBarcode')} onPress={() => router.push({ pathname: '/scan', params: { date, meal } })} />
            <Tile icon="sparkles" label={t('aiScan')} onPress={() => onDescribe()} />
          </View>
          <View style={styles.actions}>
            <Action icon="bolt.fill" label={t('quickAddTitle')} onPress={() => router.push({ pathname: '/quick-add', params: { date, meal } })} />
            <Action icon="square.and.pencil" label={t('createFood')} onPress={() => router.push('/create-food')} />
          </View>

          {favs.length > 0 && <QuickList title={t('favorites')} items={favs} onPick={onRecent} star />}

          {mine.length > 0 && <FoodList title={t('myFoods')} foods={mine.slice(0, 8)} onPick={open} />}

          {recent.length === 0 ? (
            <View style={{ gap: space.sm }}>
              <Text style={styles.section}>{t('recent')}</Text>
              <Text style={styles.hint}>{t('noRecent')}</Text>
            </View>
          ) : (
            <QuickList title={t('recent')} items={recent} onPick={onRecent} />
          )}
        </Animated.View>
      )}
    </View>
  );
}

function QuickList({ title, items, onPick, star }: { title: string; items: QuickItem[]; onPick: (e: QuickItem) => void; star?: boolean }) {
  const { t } = useApp();
  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.section}>{title}</Text>
      <Card style={{ padding: 0 }}>
        {items.map((e, i) => (
          <Animated.View key={e.id} entering={FadeInDown.delay(i * 30).duration(300)}>
            <PressableScale onPress={() => onPick(e)} scaleTo={0.98} style={[styles.row, i > 0 && styles.rowBorder]}>
              {e.thumb ? (
                <Image source={{ uri: `data:image/jpeg;base64,${e.thumb}` }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]}>
                  <Icon name={star ? 'star.fill' : 'fork.knife'} size={14} color={star ? colors.accent : colors.textDim} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {e.name}
                </Text>
                <Text style={styles.rowSub}>
                  {Math.round(e.kcal)} {t('kcal')} · P {Math.round(e.protein)} · C {Math.round(e.carbs)} · F {Math.round(e.fat)}
                </Text>
              </View>
              <Icon name="plus.circle.fill" size={24} color={colors.accent} />
            </PressableScale>
          </Animated.View>
        ))}
      </Card>
    </View>
  );
}

function FoodList({ title, foods, onPick }: { title?: string; foods: Food[]; onPick: (f: Food) => void }) {
  const { t } = useApp();
  return (
    <View style={{ gap: space.sm }}>
      {title ? <Text style={styles.section}>{title}</Text> : null}
      <Card style={{ padding: 0 }}>
        {foods.map((f, i) => {
          const s = f.servings[0];
          const u = f.unit === 'ml' ? 'ml' : t('g');
          return (
            <PressableScale
              key={f.key}
              onPress={() => {
                haptic.tap();
                onPick(f);
              }}
              hapticOnPress={false}
              scaleTo={0.98}
              style={[styles.row, i > 0 && styles.rowBorder]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {f.name}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {f.brand ? `${f.brand} · ` : ''}
                  {s
                    ? `${s.label} (${s.grams}${u}) · ${Math.round((f.per100.kcal * s.grams) / 100)} ${t('kcal')}`
                    : `100${u} · ${Math.round(f.per100.kcal)} ${t('kcal')}`}
                </Text>
              </View>
              <Icon name="plus.circle.fill" size={24} color={colors.accent} />
            </PressableScale>
          );
        })}
      </Card>
    </View>
  );
}

function Tile({ icon, label, onPress, primary }: { icon: SFSymbol; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <PressableScale onPress={onPress} style={[styles.tile, primary && { backgroundColor: colors.accent, borderColor: colors.accent }]} scaleTo={0.95}>
      <Icon name={icon} size={24} color={primary ? colors.onAccent : colors.text} />
      <Text style={[styles.tileLabel, primary && { color: colors.onAccent }]} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </PressableScale>
  );
}

function Action({ icon, label, onPress }: { icon: SFSymbol; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={styles.action} scaleTo={0.97}>
      <Icon name={icon} size={16} color={colors.accent} />
      <Text style={styles.actionLabel} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 14 },
  tiles: { flexDirection: 'row', gap: space.md },
  tile: {
    flex: 1,
    height: 104,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  tileLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: space.md },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  actionLabel: { color: colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  hint: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  rowName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.textDim, fontSize: 12, marginTop: 2, fontVariant: ['tabular-nums'] },
  thumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.surfaceHigh },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  aiText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
});
