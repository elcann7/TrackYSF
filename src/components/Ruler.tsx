import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';
import { haptic } from './ui';

const TICK_W = 12;

// ---------- Odometer: rolling digits ----------
const DIGIT_H = 84;

const Digit = memo(function Digit({ d, size }: { d: number; size: number }) {
  const h = size * 1.15;
  const y = useSharedValue(-d * h);
  useEffect(() => {
    y.value = withSpring(-d * h, { damping: 16, stiffness: 170, mass: 0.7 });
  }, [d, h, y]);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View style={{ height: h, overflow: 'hidden' }}>
      <Animated.View style={aStyle}>
        {Array.from({ length: 10 }, (_, i) => (
          <Text key={i} style={[styles.digit, { fontSize: size, height: h, lineHeight: h }]}>
            {i}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
});

export function Odometer({ value, decimals = 0, size = 72 }: { value: number; decimals?: number; size?: number }) {
  const str = value.toFixed(decimals);
  const chars = str.split('');
  const intLen = str.split('.')[0].length;
  return (
    <View style={styles.odo}>
      {chars.map((c, i) => {
        // key by position-from-right so digits keep identity when length changes
        const key = i < intLen ? `i${intLen - i}` : `f${i}`;
        if (c === '.') {
          return (
            <Text key="dot" style={[styles.digit, { fontSize: size, height: size * 1.15, lineHeight: size * 1.15 }]}>
              .
            </Text>
          );
        }
        return <Digit key={key} d={Number(c)} size={size} />;
      })}
    </View>
  );
}

// ---------- Tick ----------
const Tick = memo(function Tick({
  i,
  major,
  label,
  scrollX,
}: {
  i: number;
  major: boolean;
  label: string | null;
  scrollX: SharedValue<number>;
}) {
  const aStyle = useAnimatedStyle(() => {
    const dist = Math.abs(scrollX.value / TICK_W - i);
    const base = major ? 34 : 18;
    const height = interpolate(dist, [0, 6, 14], [base + 26, base + 6, base], Extrapolation.CLAMP);
    const opacity = interpolate(dist, [0, 10, 22], [1, 0.55, 0.25], Extrapolation.CLAMP);
    return {
      height,
      opacity,
      backgroundColor: interpolateColor(dist, [0, 1.2], [colors.accent, colors.text]),
    };
  });
  const lStyle = useAnimatedStyle(() => {
    const dist = Math.abs(scrollX.value / TICK_W - i);
    return {
      opacity: interpolate(dist, [0, 8, 20], [1, 0.6, 0.2], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(dist, [0, 6], [1.15, 1], Extrapolation.CLAMP) }],
    };
  });
  return (
    <View style={styles.tickSlot}>
      <Animated.View style={[styles.tick, major && styles.tickMajor, aStyle]} />
      {label !== null && (
        <Animated.Text style={[styles.tickLabel, lStyle]} numberOfLines={1}>
          {label}
        </Animated.Text>
      )}
    </View>
  );
});

// ---------- RulerPicker ----------
export function RulerPicker({
  min,
  max,
  step = 1,
  value,
  onChange,
  unit,
  majorEvery = 10,
  decimals = 0,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  majorEvery?: number;
  decimals?: number;
}) {
  const { width } = useWindowDimensions();
  const count = Math.round((max - min) / step) + 1;
  const initialIndex = Math.round((value - min) / step);
  const scrollX = useSharedValue(initialIndex * TICK_W);
  const lastIndex = useSharedValue(initialIndex);
  const [display, setDisplay] = useState(value);
  const pad = width / 2 - TICK_W / 2;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const emit = useCallback(
    (idx: number) => {
      const v = Number((min + idx * step).toFixed(decimals));
      setDisplay(v);
      haptic.select();
      onChangeRef.current(v);
    },
    [min, step, decimals],
  );

  const handler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
      const idx = Math.min(count - 1, Math.max(0, Math.round(e.contentOffset.x / TICK_W)));
      if (idx !== lastIndex.value) {
        lastIndex.value = idx;
        scheduleOnRN(emit, idx);
      }
    },
  });

  const ticks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const v = min + i * step;
        const unitsFromMin = Math.round(i * step * 1000) / 1000;
        const major = Math.abs(unitsFromMin / (majorEvery * step) - Math.round(unitsFromMin / (majorEvery * step))) < 1e-6;
        return { i, major, label: major ? String(Math.round(v)) : null };
      }),
    [count, min, step, majorEvery],
  );

  return (
    <View>
      <View style={styles.valueRow}>
        <Odometer value={display} decimals={decimals} size={76} />
        <Text style={styles.unit}>{unit}</Text>
      </View>

      <View style={styles.rulerWrap}>
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={handler}
          scrollEventThrottle={16}
          snapToInterval={TICK_W}
          decelerationRate="fast"
          contentOffset={{ x: initialIndex * TICK_W, y: 0 }}
          contentContainerStyle={{ paddingHorizontal: pad, alignItems: 'flex-start' }}
        >
          {ticks.map((tk) => (
            <Tick key={tk.i} i={tk.i} major={tk.major} label={tk.label} scrollX={scrollX} />
          ))}
        </Animated.ScrollView>

        {/* center marker */}
        <View pointerEvents="none" style={[styles.marker, { left: width / 2 - 1.5 }]} />
        {/* edge fades */}
        <LinearGradient
          pointerEvents="none"
          colors={[colors.bg, 'rgba(13,14,16,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, { left: 0 }]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(13,14,16,0)', colors.bg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, { right: 0 }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  odo: { flexDirection: 'row', alignItems: 'flex-end' },
  digit: {
    color: colors.text,
    fontWeight: '700',
    letterSpacing: -2,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, height: DIGIT_H + 4 },
  unit: { color: colors.textDim, fontSize: 22, fontWeight: '600', marginBottom: 16 },
  rulerWrap: { height: 120, marginTop: 24 },
  tickSlot: { width: TICK_W, alignItems: 'center', height: 120 },
  tick: { width: 2, borderRadius: 1, backgroundColor: colors.text },
  tickMajor: { width: 2.5 },
  tickLabel: {
    position: 'absolute',
    top: 72,
    left: (TICK_W - 44) / 2,
    width: 44,
    textAlign: 'center',
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  marker: {
    position: 'absolute',
    top: -6,
    width: 3,
    height: 66,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  fade: { position: 'absolute', top: 0, bottom: 0, width: 72 },
});
