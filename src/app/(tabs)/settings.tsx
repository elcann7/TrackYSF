import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Segmented, haptic } from '@/components/ui';
import { eraseAll } from '@/lib/db';
import { AnalyzeError, testKey } from '@/lib/gemini';
import type { Lang } from '@/lib/i18n';
import { computeTargets, type Targets } from '@/lib/nutrition';
import { useApp } from '@/lib/store';
import { colors, radius, space, type } from '@/theme';

export default function Settings() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { t, lang, setLang, targets, setTargets, profile, apiKey, setApiKey, resetState } = useApp();
  const [draft, setDraft] = useState<Targets | null>(targets);
  const [key, setKey] = useState(apiKey);
  const [testing, setTesting] = useState(false);

  useEffect(() => setDraft(targets), [targets]);
  useEffect(() => setKey(apiKey), [apiKey]);

  const dirty = draft && targets && JSON.stringify(draft) !== JSON.stringify(targets);

  const saveTargets = async () => {
    if (!draft) return;
    await setTargets(draft);
    haptic.success();
  };

  const recalc = () => {
    if (!profile) return;
    setDraft(computeTargets(profile));
    haptic.tap();
  };

  const test = async () => {
    setTesting(true);
    try {
      await setApiKey(key);
      await testKey(key.trim());
      haptic.success();
      Alert.alert(t('keyOk'));
    } catch (e) {
      haptic.error();
      const code = e instanceof AnalyzeError ? e.code : 'generic';
      Alert.alert(code === 'key' ? t('errKey') : code === 'busy' ? t('errBusy') : code === 'net' ? t('errNet') : t('errGeneric'));
    } finally {
      setTesting(false);
    }
  };

  const erase = () => {
    Alert.alert(t('resetAll'), t('resetConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await eraseAll(db);
          resetState();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 120, paddingHorizontal: space.lg, gap: space.lg }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{t('settings')}</Text>

      <Section title={t('language')}>
        <Segmented<Lang>
          options={[
            { value: 'az', label: 'Azərbaycanca' },
            { value: 'en', label: 'English' },
          ]}
          value={lang}
          onChange={setLang}
        />
      </Section>

      {draft && (
        <Section title={t('dailyTargets')}>
          <Card style={{ padding: 0 }}>
            <NumRow label={t('calories')} unit={t('kcal')} value={draft.kcal} color={colors.accent} onChange={(v) => setDraft({ ...draft, kcal: v })} />
            <NumRow label={t('protein')} unit={t('g')} value={draft.protein} color={colors.protein} onChange={(v) => setDraft({ ...draft, protein: v })} border />
            <NumRow label={t('carbs')} unit={t('g')} value={draft.carbs} color={colors.carbs} onChange={(v) => setDraft({ ...draft, carbs: v })} border />
            <NumRow label={t('fat')} unit={t('g')} value={draft.fat} color={colors.fat} onChange={(v) => setDraft({ ...draft, fat: v })} border />
          </Card>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title={t('recalc')} variant="secondary" onPress={recalc} style={{ flex: 1 }} />
            {dirty ? <Button title={t('save')} onPress={saveTargets} style={{ paddingHorizontal: space.xl }} /> : null}
          </View>
          <Button title={t('editProfile')} variant="ghost" icon="person.crop.circle" onPress={() => router.push('/profile')} />
        </Section>
      )}

      <Section title={t('apiKey')}>
        <TextInput
          value={key}
          onChangeText={setKey}
          placeholder={t('apiKeyPh')}
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Button title={t('testKey')} variant="secondary" icon="checkmark.shield" onPress={test} loading={testing} disabled={!key.trim()} />
        <Text style={styles.note}>
          {t('model')}: {t('modelNote')}
        </Text>
      </Section>

      <Section title={t('data')}>
        <Button title={t('resetAll')} variant="danger" icon="trash" onPress={erase} />
      </Section>

      <Text style={styles.footer}>TrackYSF · v1.0.0</Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.section}>{title}</Text>
      {children}
    </View>
  );
}

function NumRow({
  label,
  unit,
  value,
  color,
  onChange,
  border,
}: {
  label: string;
  unit: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
  border?: boolean;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <View style={[styles.row, border && styles.border]}>
      <View style={[styles.rowDot, { backgroundColor: color }]} />
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={() => {
          const n = parseInt(text, 10);
          if (!Number.isNaN(n) && n >= 0) onChange(n);
          else setText(String(value));
        }}
        keyboardType="number-pad"
        selectTextOnFocus
        style={styles.rowInput}
      />
      <Text style={styles.rowUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, fontSize: 34, color: colors.text, paddingHorizontal: space.sm },
  section: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: space.sm },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  note: { color: colors.textDim, fontSize: 13, lineHeight: 18, paddingHorizontal: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, height: 54, gap: space.md },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  rowDot: { width: 8, height: 8, borderRadius: 4 },
  rowLabel: { flex: 1, color: colors.text, fontSize: 16 },
  rowInput: { color: colors.text, fontSize: 17, fontWeight: '700', minWidth: 60, textAlign: 'right', fontVariant: ['tabular-nums'] },
  rowUnit: { color: colors.textDim, fontSize: 14, width: 34 },
  footer: { color: colors.textFaint, textAlign: 'center', fontSize: 12, marginTop: space.lg },
});
