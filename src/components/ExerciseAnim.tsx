import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { exerciseImages } from '@/lib/training';
import { colors } from '@/theme';

/**
 * Shows an exercise as motion: start and end positions cross-fade in a rep-like rhythm
 * (down 1.1 s, hold, up 1.1 s, hold). Static thumbnail when `still` is set.
 */
export function ExerciseAnim({ id, style, still }: { id: string; style?: StyleProp<ViewStyle>; still?: boolean }) {
  const [a, b] = exerciseImages(id);
  const o = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    o.value = withRepeat(
      withSequence(
        withDelay(500, withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) })),
        withDelay(500, withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.cubic) })),
      ),
      -1,
    );
  }, [o, still]);
  const top = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <View style={[styles.wrap, style]}>
      <Image source={{ uri: a }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" transition={200} />
      {!still && (
        <Animated.View style={[StyleSheet.absoluteFill, top]}>
          <Image source={{ uri: b }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: colors.surfaceHigh },
});
