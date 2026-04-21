import { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

/**
 * Simulates the portfolio dot grid background:
 * radial-gradient(rgba(255,255,255,0.13) 1px, transparent 1px)
 * background-size: 22px 22px
 *
 * Renders a grid of 1px dots absolutely positioned over the screen.
 */
export function DotGrid() {
  const { width, height } = useWindowDimensions();
  const spacing = 22;

  const dots = useMemo(() => {
    const cols = Math.ceil(width / spacing) + 1;
    const rows = Math.ceil(height / spacing) + 2;
    const result: { key: string; x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result.push({ key: `${r}-${c}`, x: c * spacing, y: r * spacing });
      }
    }
    return result;
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots.map((d) => (
        <View
          key={d.key}
          style={{
            position: "absolute",
            left: d.x,
            top: d.y,
            width: 1,
            height: 1,
            borderRadius: 0.5,
            backgroundColor: "rgba(255,255,255,0.13)",
          }}
        />
      ))}
    </View>
  );
}
