import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// ────────────────────────────────────────────────────────────────────────────
// RainDrop
// ────────────────────────────────────────────────────────────────────────────
const RainDrop = ({ x, delay, speed, w, opacity }: { x: number; delay: number; speed: number; w: number; opacity: number }) => {
  const y = useSharedValue(-20);

  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withTiming(height + 20, { duration: speed, easing: Easing.linear }), -1, false));
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: 0, width: w, height: w * 10, borderRadius: 2, backgroundColor: `rgba(180,220,255,${opacity})` },
        style,
      ]}
    />
  );
};

// ────────────────────────────────────────────────────────────────────────────
// SnowFlake
// ────────────────────────────────────────────────────────────────────────────
const SnowFlake = ({ x, y: initY, delay, speed, size }: { x: number; y: number; delay: number; speed: number; size: number }) => {
  const translateY = useSharedValue(initY);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(0.85, { duration: 400 }));
    translateY.value = withDelay(delay, withRepeat(withTiming(height + 20, { duration: speed, easing: Easing.linear }), -1, false));
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(8, { duration: speed / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(-8, { duration: speed / 2, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(220,240,255,0.9)' },
        style,
      ]}
    />
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Star (clear sky)
// ────────────────────────────────────────────────────────────────────────────
const Star = ({ x, y: initY, delay, duration, size }: { x: number; y: number; delay: number; duration: number; size: number }) => {
  const opacity = useSharedValue(0.1);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(0.6 + Math.random() * 0.4, { duration, easing: Easing.inOut(Easing.ease) }), -1, true)
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: initY, width: size, height: size, borderRadius: size / 2, backgroundColor: 'white' },
        style,
      ]}
    />
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Cloud (drifting slowly — for Cloudy & Foggy)
// ────────────────────────────────────────────────────────────────────────────
const FloatingCloud = ({ y: initY, delay, speed, opacity: cloudOpacity, w, blur }: {
  y: number; delay: number; speed: number; opacity: number; w: number; blur: boolean;
}) => {
  const translateX = useSharedValue(-w);

  useEffect(() => {
    translateX.value = withDelay(delay, withRepeat(withTiming(width + w, { duration: speed, easing: Easing.linear }), -1, false));
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  const color = blur ? 'rgba(160,170,180,0.18)' : 'rgba(180,195,210,0.22)';

  return (
    <Animated.View style={[{ position: 'absolute', top: initY, width: w, height: w * 0.55, borderRadius: w * 0.27 }, style]}>
      <View style={{ flex: 1, backgroundColor: color, borderRadius: w * 0.27 }} />
    </Animated.View>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Lightning flash (storm only)
// ────────────────────────────────────────────────────────────────────────────
const Lightning = ({ delay }: { delay: number }) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    const interval = setInterval(() => {
      opacity.value = withSequence(
        withTiming(0.7, { duration: 80 }),
        withTiming(0, { duration: 80 }),
        withTiming(0.5, { duration: 60 }),
        withTiming(0, { duration: 200 })
      );
    }, 3000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(200,220,255,0.4)' },
        style,
      ]}
    />
  );
};

// ────────────────────────────────────────────────────────────────────────────
// FogLayer
// ────────────────────────────────────────────────────────────────────────────
const FogLayer = ({ y: initY, delay, speed, opacity: fogOpacity }: { y: number; delay: number; speed: number; opacity: number }) => {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    translateX.value = withDelay(delay, withRepeat(withTiming(width, { duration: speed, easing: Easing.linear }), -1, false));
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', top: initY, left: 0, width: width * 2, height: 60, backgroundColor: `rgba(200,210,220,${fogOpacity})`, borderRadius: 30 },
        style,
      ]}
    />
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────

function getSceneType(code: number): 'clear' | 'cloudy' | 'fog' | 'rain' | 'heavyRain' | 'snow' | 'storm' | 'none' {
  if (code === 0) return 'clear';
  if (code >= 1 && code <= 3) return 'cloudy';
  if (code >= 45 && code <= 48) return 'fog';
  if (code >= 51 && code <= 67) return 'rain';
  if (code >= 80 && code <= 82) return 'heavyRain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 95) return 'storm';
  return 'none';
}

export function WeatherAnimation({ conditionCode }: { conditionCode: number }) {
  const scene = getSceneType(conditionCode);

  // ── Clear — stars ──────────────────────────────────────────────────────────
  if (scene === 'clear') {
    const stars = Array.from({ length: 35 }).map((_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height * 0.65,
      delay: Math.random() * 2000,
      duration: 1200 + Math.random() * 1500,
      size: 1.5 + Math.random() * 2,
    }));
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {stars.map(s => <Star key={s.id} x={s.x} y={s.y} delay={s.delay} duration={s.duration} size={s.size} />)}
      </View>
    );
  }

  // ── Cloudy ────────────────────────────────────────────────────────────────
  if (scene === 'cloudy') {
    const clouds = Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      y: 20 + i * 55 + Math.random() * 30,
      delay: i * 4000 + Math.random() * 3000,
      speed: 28000 + Math.random() * 20000,
      opacity: 0.7 + Math.random() * 0.3,
      w: 140 + Math.random() * 120,
    }));
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {clouds.map(c => (
          <FloatingCloud key={c.id} y={c.y} delay={c.delay} speed={c.speed} opacity={c.opacity} w={c.w} blur={false} />
        ))}
      </View>
    );
  }

  // ── Fog ───────────────────────────────────────────────────────────────────
  if (scene === 'fog') {
    const fogLayers = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      y: 60 + i * 70 + Math.random() * 40,
      delay: i * 2500 + Math.random() * 2000,
      speed: 20000 + Math.random() * 15000,
      opacity: 0.08 + Math.random() * 0.08,
    }));
    const clouds = Array.from({ length: 4 }).map((_, i) => ({
      id: i + 100,
      y: 10 + i * 80,
      delay: i * 6000,
      speed: 35000 + Math.random() * 15000,
      opacity: 0.5,
      w: 200 + Math.random() * 100,
    }));
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {clouds.map(c => <FloatingCloud key={c.id} y={c.y} delay={c.delay} speed={c.speed} opacity={c.opacity} w={c.w} blur={true} />)}
        {fogLayers.map(f => <FogLayer key={f.id} y={f.y} delay={f.delay} speed={f.speed} opacity={f.opacity} />)}
      </View>
    );
  }

  // ── Rain ──────────────────────────────────────────────────────────────────
  if (scene === 'rain') {
    const drops = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * width,
      delay: Math.random() * 2000,
      speed: 900 + Math.random() * 400,
      w: 1.5 + Math.random() * 1,
      opacity: 0.35 + Math.random() * 0.25,
    }));
    const clouds = Array.from({ length: 3 }).map((_, i) => ({
      id: i + 200,
      y: 10 + i * 50,
      delay: i * 5000,
      speed: 32000,
      opacity: 0.8,
      w: 180 + i * 40,
    }));
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {clouds.map(c => <FloatingCloud key={c.id} y={c.y} delay={c.delay} speed={c.speed} opacity={c.opacity} w={c.w} blur={false} />)}
        {drops.map(d => <RainDrop key={d.id} x={d.x} delay={d.delay} speed={d.speed} w={d.w} opacity={d.opacity} />)}
      </View>
    );
  }

  // ── Heavy Rain / Averses ──────────────────────────────────────────────────
  if (scene === 'heavyRain') {
    const drops = Array.from({ length: 65 }).map((_, i) => ({
      id: i,
      x: Math.random() * width,
      delay: Math.random() * 1500,
      speed: 700 + Math.random() * 300,
      w: 2 + Math.random() * 1.5,
      opacity: 0.5 + Math.random() * 0.3,
    }));
    const clouds = Array.from({ length: 4 }).map((_, i) => ({
      id: i + 300,
      y: 0 + i * 40,
      delay: i * 4000,
      speed: 26000,
      opacity: 0.9,
      w: 200 + i * 30,
    }));
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {clouds.map(c => <FloatingCloud key={c.id} y={c.y} delay={c.delay} speed={c.speed} opacity={c.opacity} w={c.w} blur={false} />)}
        {drops.map(d => <RainDrop key={d.id} x={d.x} delay={d.delay} speed={d.speed} w={d.w} opacity={d.opacity} />)}
      </View>
    );
  }

  // ── Snow ──────────────────────────────────────────────────────────────────
  if (scene === 'snow') {
    const flakes = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * -100,
      delay: Math.random() * 4000,
      speed: 4000 + Math.random() * 3000,
      size: 3 + Math.random() * 5,
    }));
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {flakes.map(f => <SnowFlake key={f.id} x={f.x} y={f.y} delay={f.delay} speed={f.speed} size={f.size} />)}
      </View>
    );
  }

  // ── Storm — heavy rain + lightning ────────────────────────────────────────
  if (scene === 'storm') {
    const drops = Array.from({ length: 75 }).map((_, i) => ({
      id: i,
      x: Math.random() * width,
      delay: Math.random() * 1200,
      speed: 600 + Math.random() * 250,
      w: 2 + Math.random() * 2,
      opacity: 0.55 + Math.random() * 0.3,
    }));
    const clouds = Array.from({ length: 5 }).map((_, i) => ({
      id: i + 400,
      y: i * 35,
      delay: i * 3000,
      speed: 22000,
      opacity: 1,
      w: 220 + i * 20,
    }));
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Lightning delay={0} />
        {clouds.map(c => <FloatingCloud key={c.id} y={c.y} delay={c.delay} speed={c.speed} opacity={c.opacity} w={c.w} blur={false} />)}
        {drops.map(d => <RainDrop key={d.id} x={d.x} delay={d.delay} speed={d.speed} w={d.w} opacity={d.opacity} />)}
      </View>
    );
  }

  // ── 'none' ─────────────────────────────────────────────────────────────────
  return null;
}
