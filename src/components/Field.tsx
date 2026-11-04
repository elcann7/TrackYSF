import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, space } from '@/theme';

/** Labeled text input used by the manual food forms. */
export function Field({
  label,
  suffix,
  dot,
  style,
  ...rest
}: TextInputProps & { label: string; suffix?: string; dot?: string }) {
  return (
    <View style={[styles.wrap, style as object]}>
      <View style={styles.labelRow}>
        {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.inputRow}>
        <TextInput placeholderTextColor={colors.textFaint} style={styles.input} {...rest} />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

/** Parse "12,5" or "12.5"; empty → 0. */
export function num(s: string): number {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
  },
  input: { flex: 1, color: colors.text, fontSize: 17, paddingVertical: 14, fontWeight: '500' },
  suffix: { color: colors.textDim, fontSize: 14, fontWeight: '600', marginLeft: 6 },
});
