import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FoodPicker, type QuickItem } from '@/components/FoodPicker';
import { Button, Card, Icon, PressableScale, Segmented, haptic } from '@/components/ui';
import { MEALS, addEntry, type Entry, type FoodItem, type MealType } from '@/lib/db';
import { mealForNow, todayKey } from '@/lib/dates';
import { AnalyzeError, analyzeMeal, scaleItem, type Analysis } from '@/lib/gemini';
import type { TKey } from '@/lib/i18n';
import { sumMacros, r1 } from '@/lib/nutrition';
import { useApp } from '@/lib/store';
import { colors, radius, space, type } from '@/theme';

type Mode = 'pick' | 'photo' | 'text';

interface Photo {
  uri: string;
  base64: string; // ~1024px JPEG sent to Gemini
  thumb: string; // ~160px JPEG stored in diary
}

async function preparePhoto(uri: string): Promise<Photo> {
  const big = await ImageManipulator.manipulate(uri).resize({ width: 1024, height: null }).renderAsync();
  const bigRes = await big.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true });
  const small = await ImageManipulator.manipulate(uri).resize({ width: 160, height: null }).renderAsync();
  const smallRes = await small.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  return { uri: bigRes.uri, base64: bigRes.base64 ?? '', thumb: smallRes.base64 ?? '' };
}

export default function AddFood() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, lang, apiKey, bump } = useApp();
  const params = useLocalSearchParams<{ date?: string; meal?: MealType }>();
  const date = params.date ?? todayKey();

  const [mode, setMode] = useState<Mode>('pick');
  const [meal, setMeal] = useState<MealType>(params.meal ?? mealForNow());
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [foodName, setFoodName] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [base, setBase] = useState<FoodItem[]>([]); // AI items, source for scaling
  const [items, setItems] = useState<FoodItem[]>([]);
  const [name, setName] = useState('');
  const totals = useMemo(() => sumMacros(items), [items]);

  const pick = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
      }
      const res =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (res.canceled || !res.assets?.[0]) return;
      const p = await preparePhoto(res.assets[0].uri);
      setPhoto(p);
      setAnalysis(null);
      setMode('photo');
    } catch (e) {
      Alert.alert(t('errGeneric'), String(e));
    }
  };

  const run = async () => {
    if (!apiKey) {
      Alert.alert(t('noKey'));
      return;
    }
    if (!photo && !details.trim() && !foodName.trim()) {
      Alert.alert(t('needInput'));
      return;
    }
    setBusy(true);
    try {
      const a = await analyzeMeal({ apiKey, lang, imageBase64: photo?.base64, foodName, details });
      haptic.success();
      setAnalysis(a);
      setBase(a.items);
      setItems(a.items);
      setName(foodName.trim() || a.name);
    } catch (e) {
      haptic.error();
      const code = e instanceof AnalyzeError ? e.code : 'generic';
      const key: TKey = code === 'busy' ? 'errBusy' : code === 'rate' ? 'errRate' : code === 'key' ? 'errKey' : code === 'net' ? 'errNet' : 'errGeneric';
      Alert.alert(t(key));
    } finally {
      setBusy(false);
    }
  };

  const setGrams = (idx: number, grams: number) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? scaleItem(base[idx], grams) : it)));
  };

  const removeItem = (idx: number) => {
    haptic.tap();
    setBase((b) => b.filter((_, i) => i !== idx));
    setItems((b) => b.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (items.length === 0) return;
    await addEntry(db, {
      date,
      meal,
      name: name.trim() || analysis?.name || '—',
      kcal: Math.round(totals.kcal),
      protein: r1(totals.protein),
      carbs: r1(totals.carbs),
      fat: r1(totals.fat),
      items,
      thumb: photo?.thumb ?? null,
    });
    haptic.success();
    bump();
    router.back();
  };

  const quickAdd = async (e: QuickItem) => {
    await addEntry(db, { date, meal, name: e.name, kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat, items: e.items, thumb: e.thumb });
    haptic.success();
    bump();
    router.dismissAll();
  };

  const mealOptions = MEALS.map((m) => ({ value: m, label: t(m) }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* header */}
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="xmark" size={16} color={colors.text} weight="semibold" />
        </PressableScale>
        <Text style={styles.headerTitle}>{t('addTitle')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + 120, gap: space.lg }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Segmented options={mealOptions} value={meal} onChange={setMeal} />

        {/* ---------- PICK ---------- */}
        {mode === 'pick' && (
          <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={{ gap: space.lg }}>
            {!apiKey && (
              <Card style={styles.keyCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="key.fill" size={18} color={colors.accent} />
                  <Text style={styles.keyTitle}>{t('noKeyTitle')}</Text>
                </View>
                <Text style={styles.hint}>{t('noKeyBody')}</Text>
                <Button
                  title={t('goToSettings')}
                  variant="secondary"
                  icon="gearshape"
                  onPress={() => {
                    router.dismissAll();
                    router.navigate('/settings');
                  }}
                />
              </Card>
            )}
            <FoodPicker
              date={date}
              meal={meal}
              onCamera={() => pick('camera')}
              onLibrary={() => pick('library')}
              onDescribe={(prefill) => {
                if (prefill) setDetails(prefill);
                setMode('text');
              }}
              onRecent={quickAdd}
            />
          </Animated.View>
        )}

        {/* ---------- PHOTO / TEXT INPUT ---------- */}
        {(mode === 'photo' || mode === 'text') && (
          <Animated.View entering={FadeInDown.duration(350)} style={{ gap: space.lg }}>
            {mode === 'photo' && photo && (
              <PressableScale onPress={() => !busy && pick('camera')} scaleTo={0.99} hapticOnPress={false}>
                <View style={styles.photoWrap}>
                  <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" transition={250} />
                  {busy && <ScanOverlay />}
                  {!busy && !analysis && (
                    <View style={styles.photoHint}>
                      <Text style={styles.photoHintText}>{t('retakeHint')}</Text>
                    </View>
                  )}
                </View>
              </PressableScale>
            )}

            {!analysis && (
              <Card style={{ gap: space.md }}>
                <Text style={styles.section}>{mode === 'photo' ? t('detailsTitle') : t('describe')}</Text>
                {mode === 'photo' && (
                  <TextInput
                    value={foodName}
                    onChangeText={setFoodName}
                    placeholder={t('foodNamePh')}
                    placeholderTextColor={colors.textFaint}
                    style={styles.input}
                    returnKeyType="next"
                  />
                )}
                <TextInput
                  value={details}
                  onChangeText={setDetails}
                  placeholder={mode === 'photo' ? t('detailsPh') : t('describePh')}
                  placeholderTextColor={colors.textFaint}
                  style={[styles.input, styles.inputMulti]}
                  multiline
                  autoFocus={mode === 'text'}
                />
              </Card>
            )}

            {busy && (
              <Animated.Text entering={FadeIn} style={styles.busyText}>
                {t('analyzing')}
              </Animated.Text>
            )}

            {/* ---------- RESULT ---------- */}
            {analysis && (
              <Animated.View entering={FadeInDown.duration(450)} layout={LinearTransition} style={{ gap: space.lg }}>
                <Card style={{ gap: space.lg }}>
                  <TextInput value={name} onChangeText={setName} style={styles.resultName} placeholderTextColor={colors.textFaint} />
                  <View style={styles.totalsRow}>
                    <View>
                      <Text style={styles.totalKcal}>{Math.round(totals.kcal)}</Text>
                      <Text style={styles.totalUnit}>{t('kcal')}</Text>
                    </View>
                    <View style={styles.macroChips}>
                      <MacroChip label={t('protein')} value={totals.protein} color={colors.protein} unit={t('g')} />
                      <MacroChip label={t('carbs')} value={totals.carbs} color={colors.carbs} unit={t('g')} />
                      <MacroChip label={t('fat')} value={totals.fat} color={colors.fat} unit={t('g')} />
                    </View>
                  </View>
                  <View style={styles.confRow}>
                    <View style={[styles.confDot, { backgroundColor: analysis.confidence === 'high' ? colors.success : analysis.confidence === 'low' ? colors.danger : colors.carbs }]} />
                    <Text style={styles.confText}>
                      {t('confidence')}: {t(`conf_${analysis.confidence}` as TKey)}
                    </Text>
                  </View>
                  {analysis.notes ? <Text style={styles.notes}>{analysis.notes}</Text> : null}
                </Card>

                <View style={{ gap: 6 }}>
                  <Text style={styles.section}>{t('items')}</Text>
                  <Text style={styles.hint}>{t('adjustHint')}</Text>
                </View>
                <Card style={{ padding: 0 }}>
                  {items.map((it, i) => (
                    <Animated.View key={`${base[i]?.name}-${i}`} layout={LinearTransition} exiting={FadeOut.duration(150)} style={[styles.itemRow, i > 0 && styles.rowBorder]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {it.name}
                        </Text>
                        <Text style={styles.itemSub}>
                          {Math.round(it.kcal)} {t('kcal')} · P {Math.round(it.protein)} · C {Math.round(it.carbs)} · F {Math.round(it.fat)}
                        </Text>
                      </View>
                      <GramStepper value={it.grams} onChange={(g) => setGrams(i, g)} unit={t('g')} />
                      <PressableScale onPress={() => removeItem(i)} style={styles.removeBtn} hapticOnPress={false}>
                        <Icon name="minus.circle" size={20} color={colors.textFaint} />
                      </PressableScale>
                    </Animated.View>
                  ))}
                </Card>
                <Button title={t('reanalyze')} variant="ghost" icon="arrow.clockwise" onPress={() => { setAnalysis(null); }} />
              </Animated.View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {mode !== 'pick' && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
          {analysis ? (
            <Button title={t('addToDiary')} icon="checkmark" onPress={save} disabled={items.length === 0} />
          ) : (
            <Button title={t('analyze')} icon="sparkles" onPress={run} loading={busy} />
          )}
        </View>
      )}
    </View>
  );
}

function MacroChip({ label, value, color, unit }: { label: string; value: number; color: string; unit: string }) {
  return (
    <View style={styles.chip}>
      <View style={[styles.chipBar, { backgroundColor: color }]} />
      <View>
        <Text style={styles.chipVal}>
          {Math.round(value)}
          <Text style={styles.chipUnit}>{unit}</Text>
        </Text>
        <Text style={styles.chipLabel}>{label}</Text>
      </View>
    </View>
  );
}

function GramStepper({ value, onChange, unit }: { value: number; onChange: (g: number) => void; unit: string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const step = value >= 200 ? 25 : 10;
  return (
    <View style={styles.stepper}>
      <PressableScale onPress={() => onChange(Math.max(0, value - step))} style={styles.stepBtn} hapticOnPress>
        <Icon name="minus" size={12} color={colors.text} weight="bold" />
      </PressableScale>
      <View style={styles.stepValWrap}>
        <TextInput
          value={text}
          onChangeText={setText}
          onEndEditing={() => {
            const n = parseInt(text, 10);
            if (!Number.isNaN(n)) onChange(n);
            else setText(String(value));
          }}
          keyboardType="number-pad"
          style={styles.stepVal}
          selectTextOnFocus
        />
        <Text style={styles.stepUnit}>{unit}</Text>
      </View>
      <PressableScale onPress={() => onChange(value + step)} style={styles.stepBtn} hapticOnPress>
        <Icon name="plus" size={12} color={colors.text} weight="bold" />
      </PressableScale>
    </View>
  );
}

/** Matte scanning band sweeping over the photo while Gemini works. */
function ScanOverlay() {
  const y = useSharedValue(0);
  const o = useSharedValue(0.25);
  useEffect(() => {
    y.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
    o.value = withRepeat(withSequence(withTiming(0.45, { duration: 700 }), withTiming(0.25, { duration: 700 })), -1);
  }, [y, o]);
  const lineStyle = useAnimatedStyle(() => ({ top: `${y.value * 92 + 4}%` }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, dimStyle]} />
      <Animated.View style={[styles.scanLine, lineStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  section: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  keyCard: { gap: space.md, borderColor: colors.accent, borderWidth: 1 },
  keyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  hint: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  photoWrap: { borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface },
  photo: { width: '100%', aspectRatio: 1 },
  photoHint: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  photoHintText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.accent, opacity: 0.9 },
  busyText: { color: colors.textDim, textAlign: 'center', fontSize: 15, fontWeight: '600' },
  input: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  inputMulti: { minHeight: 96, textAlignVertical: 'top', paddingTop: 14 },
  resultName: { ...type.h2, color: colors.text, padding: 0 },
  totalsRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  totalKcal: { color: colors.text, fontSize: 48, fontWeight: '700', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  totalUnit: { color: colors.textDim, fontSize: 14, fontWeight: '600', marginTop: -4 },
  macroChips: { flex: 1, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chipBar: { width: 4, height: 28, borderRadius: 2 },
  chipVal: { color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chipUnit: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  chipLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '600' },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confDot: { width: 8, height: 8, borderRadius: 4 },
  confText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  notes: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.lg, paddingRight: space.sm, paddingVertical: space.md },
  itemName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  itemSub: { color: colors.textDim, fontSize: 12, marginTop: 3, fontVariant: ['tabular-nums'] },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceHigh, borderRadius: radius.pill, padding: 3 },
  stepBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceHigher, alignItems: 'center', justifyContent: 'center' },
  stepValWrap: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 6 },
  stepVal: { color: colors.text, fontSize: 15, fontWeight: '700', minWidth: 30, textAlign: 'right', padding: 0, fontVariant: ['tabular-nums'] },
  stepUnit: { color: colors.textDim, fontSize: 12, marginLeft: 2 },
  removeBtn: { padding: 6 },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
});
