import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/theme';
import { AnimatedNumber } from './ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function Ring({
  size,
  stroke,
  progress,
  color,
  track = colors.surfaceHigher,
  children,
}: {
  size: number;
  stroke: number;
  progress: number; // 0..1 (values > 1 are clamped visually)
  color: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress, p]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function CalorieRing({
  eaten,
  target,
  leftLabel,
  overLabel,
  unit,
}: {
  eaten: number;
  target: number;
  leftLabel: string;
  overLabel: string;
  unit: string;
}) {
  const left = Math.round(target - eaten);
  const over = left < 0;
  return (
    <Ring size={196} stroke={14} progress={target > 0 ? eaten / target : 0} color={over ? colors.danger : colors.accent}>
      <View style={{ alignItems: 'center' }}>
        <AnimatedNumber value={Math.abs(left)} style={styles.big} />
        <Text style={styles.sub}>
          {unit} {over ? overLabel : leftLabel}
        </Text>
      </View>
    </Ring>
  );
}

const styles = StyleSheet.create({
  big: { color: colors.text, fontSize: 46, fontWeight: '700', letterSpacing: -1.5 },
  sub: { color: colors.textDim, fontSize: 14, fontWeight: '600', marginTop: -2 },
});
