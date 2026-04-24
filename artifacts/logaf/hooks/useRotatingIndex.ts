import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";

/**
 * Rotates through indices 0..length-1 on a fixed interval, animating
 * opacity from 1 → 0 → 1 around each index change.
 *
 * @param length     - Total number of items to rotate through.
 * @param intervalMs - Total cycle time in ms (including fades).
 * @param fadeOutMs  - Duration of the fade-out animation.
 * @param fadeInMs   - Duration of the fade-in animation. Defaults to fadeOutMs.
 * @returns Tuple of [currentIndex, animatedOpacity]
 */
export function useRotatingIndex(
  length: number,
  intervalMs: number,
  fadeOutMs: number = 200,
  fadeInMs: number = fadeOutMs,
): [number, Animated.Value] {
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (length <= 1) return;

    const interval = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: fadeOutMs,
        useNativeDriver: true,
      }).start(() => {
        setIndex((i) => (i + 1) % length);
        Animated.timing(opacity, {
          toValue: 1,
          duration: fadeInMs,
          useNativeDriver: true,
        }).start();
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [length, intervalMs, fadeOutMs, fadeInMs, opacity]);

  return [index, opacity];
}
