import DateTimePicker from '@react-native-community/datetimepicker';
import { StyleSheet, Text, View } from 'react-native';
import { formatTime, timeToDate } from '@/lib/reminders';
import { colors, space } from '@/theme';
import { PressableScale, haptic } from './ui';

/** Label + native iOS compact time picker (24 h). */
export function TimeField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <View style={[styles.row, disabled && { opacity: 0.4 }]} pointerEvents={disabled ? 'none' : 'auto'}>
      <Text style={styles.label}>{label}</Text>
      <DateTimePicker
        value={timeToDate(value)}
        mode="time"
        display="compact"
        locale="en_GB"
        themeVariant="dark"
        accentColor={colors.accent}
        onChange={(_, d) => d && onChange(formatTime(d))}
      />
    </View>
  );
}

/** Monday-first weekday multi-select. */
export function WeekdayPicker({
  value,
  onChange,
  labels,
  max,
}: {
  value: number[];
  onChange: (v: number[]) => void;
  /** Sunday-first short names (like WEEKDAYS[lang]). */
  labels: string[];
  max?: number;
}) {
  return (
    <View style={styles.days}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const sel = value.includes(i);
        const blocked = !sel && max != null && value.length >= max;
        return (
          <PressableScale
            key={i}
            hapticOnPress={false}
            onPress={() => {
              if (blocked) return;
              haptic.select();
              onChange(sel ? value.filter((x) => x !== i) : [...value, i].sort((a, b) => a - b));
            }}
            style={[styles.day, sel && styles.daySel, blocked && { opacity: 0.35 }]}
          >
            <Text style={[styles.dayText, sel && { color: colors.onAccent }]}>{labels[(i + 1) % 7]}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, minHeight: 52, gap: space.md },
  label: { flex: 1, color: colors.text, fontSize: 15 },
  days: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  daySel: { backgroundColor: colors.accent },
  dayText: { color: colors.text, fontSize: 12, fontWeight: '700' },
});
