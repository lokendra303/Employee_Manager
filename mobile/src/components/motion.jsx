import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export function useFadeInUp(delay = 0, duration = 450) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, duration, opacity, translateY]);

  return { opacity, transform: [{ translateY }] };
}

export function FadeInUp({ children, delay = 0, style }) {
  const anim = useFadeInUp(delay);
  return <Animated.View style={[anim, style]}>{children}</Animated.View>;
}

export function FadeIn({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay, opacity]);
  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
}

export function MeshBackground({ variant = 'default' }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  const orbScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const orbOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.55] });

  const palette = variant === 'dark'
    ? { a: 'rgba(45, 212, 191, 0.22)', b: 'rgba(13, 148, 136, 0.18)', c: 'rgba(255,255,255,0.05)' }
    : { a: 'rgba(20, 184, 166, 0.14)', b: 'rgba(13, 148, 136, 0.1)', c: 'rgba(45, 212, 191, 0.08)' };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[meshStyles.orb, meshStyles.orbA, { backgroundColor: palette.a, opacity: orbOpacity, transform: [{ scale: orbScale }] }]}
      />
      <Animated.View
        style={[meshStyles.orb, meshStyles.orbB, { backgroundColor: palette.b, opacity: orbOpacity, transform: [{ scale: orbScale }] }]}
      />
      <View style={[meshStyles.orb, meshStyles.orbC, { backgroundColor: palette.c }]} />
    </View>
  );
}

export function PulseLoader({ label = 'Loading...' }) {
  const spin = useRef(new Animated.Value(0)).current;
  const fade = useFadeInUp(0, 300);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[loaderStyles.wrap, fade]}>
      <Animated.View style={[loaderStyles.ring, { transform: [{ rotate }] }]} />
      <Animated.Text style={loaderStyles.label}>{label}</Animated.Text>
    </Animated.View>
  );
}

const meshStyles = StyleSheet.create({
  orb: { position: 'absolute', borderRadius: 999 },
  orbA: { width: 240, height: 240, top: -50, right: -70 },
  orbB: { width: 200, height: 200, bottom: 100, left: -60 },
  orbC: { width: 140, height: 140, top: '35%', right: 10 },
});

const loaderStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24, backgroundColor: colors.background },
  ring: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: colors.primarySoft,
    borderTopColor: colors.primary,
    borderRightColor: colors.accent,
  },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
});

export const webGradient = Platform.select({
  web: {
    primaryButton: { backgroundImage: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 50%, ${colors.primaryDark} 100%)` },
    hero: { backgroundImage: `linear-gradient(160deg, ${colors.header} 0%, ${colors.headerEnd} 55%, #115e59 100%)` },
  },
  default: {},
});
