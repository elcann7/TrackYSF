import * as Haptics from 'expo-haptics';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { colors, radius, space, type } from '@/theme';

export const haptic = {
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  select: () => Haptics.selectionAsync().catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};

// ---------- PressableScale ----------
type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hapticOnPress?: boolean;
  children?: ReactNode;
};

export function PressableScale({ style, scaleTo = 0.96, hapticOnPress = true, onPress, children, ...rest }: PressableScaleProps) {
  const s = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        s.value = withSpring(scaleTo, { damping: 20, stiffness: 400 });
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, { damping: 14, stiffness: 300 });
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (hapticOnPress) haptic.tap();
        onPress?.(e);
      }}
    >
      <Animated.View style={[style, aStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

// ---------- Button ----------
export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: SFSymbol;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.surfaceHigh : 'transparent';
  const fg =
    variant === 'primary' ? colors.onAccent : variant === 'danger' ? colors.danger : colors.text;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : 1 },
        variant === 'ghost' || variant === 'danger' ? styles.btnGhost : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.btnRow}>
          {icon ? <Icon name={icon} size={18} color={fg} weight="semibold" /> : null}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </PressableScale>
  );
}

// ---------- Icon ----------
export function Icon({
  name,
  size = 20,
  color = colors.text,
  weight = 'regular',
}: {
  name: SFSymbol;
  size?: number;
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}) {
  return <SymbolView name={name} size={size} tintColor={color} weight={weight} resizeMode="scaleAspectFit" style={{ width: size, height: size }} />;
}

// ---------- Card ----------
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------- AnimatedNumber (count-up) ----------
export function useCountUp(target: number, duration = 700): number {
  const [val, setVal] = useState(target);
  const valRef = useRef(target);
  useEffect(() => {
    const from = valRef.current;
    if (from === target) return;
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * eased;
      valRef.current = v;
      setVal(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export function AnimatedNumber({
  value,
  style,
  decimals = 0,
  suffix = '',
}: {
  value: number;
  style?: StyleProp<TextStyle>;
  decimals?: number;
  suffix?: string;
}) {
  const v = useCountUp(value);
  return <Text style={[type.num, style]}>{v.toFixed(decimals) + suffix}</Text>;
}

// ---------- MacroBar ----------
export function MacroBar({
  label,
  value,
  target,
  color,
  unit,
  compact,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  unit: string;
  compact?: boolean;
}) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(pct, { duration: 800 });
  }, [pct, w]);
  const aStyle = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={[styles.macroLabel]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, aStyle]} />
      </View>
      <Text style={[styles.macroVal, compact && { fontSize: 13 }]}>
        <Text style={{ color: colors.text }}>{Math.round(value)}</Text>
        <Text style={{ color: colors.textFaint }}>
          {' '}/ {Math.round(target)}
          {unit}
        </Text>
      </Text>
    </View>
  );
}

// ---------- Segmented ----------
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const segW = options.length ? w / options.length : 0;
  useEffect(() => {
    x.value = withSpring(idx * segW, { damping: 20, stiffness: 220 });
  }, [idx, segW, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={styles.seg} onLayout={(e) => setW(e.nativeEvent.layout.width - 8)}>
      {w > 0 && <Animated.View style={[styles.segPill, { width: segW }, pill]} />}
      {options.map((o) => (
        <Pressable
          key={o.value}
          style={styles.segItem}
          onPress={() => {
            if (o.value !== value) haptic.select();
            onChange(o.value);
          }}
        >
          <Text style={[styles.segText, o.value === value && { color: colors.text }]} numberOfLines={1}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  btnGhost: { height: 48 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  macroLabel: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  macroVal: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceHigher, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  seg: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    padding: 4,
  },
  segPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.surfaceHigher,
  },
  segItem: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center' },
  segText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
});
