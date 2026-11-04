import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExerciseAnim } from '@/components/ExerciseAnim';
import { EXERCISES, MUSCLE_NAMES, exerciseName } from '@/lib/training';
import { useApp } from '@/lib/store';
import { colors, radius, space, type } from '@/theme';

export default function ExerciseSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useApp();
  const info = EXERCISES[id];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: space.xl, paddingTop: space.xxl, gap: space.lg }}>
      <ExerciseAnim id={id} style={styles.anim} />
      <Text style={styles.name}>{exerciseName(id, lang)}</Text>
      {info && (
        <>
          <View style={styles.chips}>
            {info.muscles.map((m) => (
              <View key={m} style={styles.chip}>
                <Text style={styles.chipText}>{MUSCLE_NAMES[lang][m]}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.section}>{t('howTo')}</Text>
          <View style={{ gap: space.md }}>
            {info.cues[lang].map((c, i) => (
              <View key={i} style={styles.cue}>
                <View style={styles.num}>
                  <Text style={styles.numText}>{i + 1}</Text>
                </View>
                <Text style={styles.cueText}>{c}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      <Text style={styles.credit}>Images: free-exercise-db (public domain)</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  anim: { width: '100%', aspectRatio: 1.4, borderRadius: radius.lg },
  name: { ...type.h2, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.accentSoft },
  chipText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  section: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  cue: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  num: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  numText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  cueText: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 22 },
  credit: { color: colors.textFaint, fontSize: 11, marginTop: space.md },
});
