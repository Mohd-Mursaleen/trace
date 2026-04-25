import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { isFuture, isToday } from "@/lib/dates";

type Props = {
  iso: string | null;
  size: number;
  fontSize: number;
  preview: string | null | undefined;
  hasText: boolean;
  onPress?: (iso: string) => void;
};

export function CalendarDayCell({
  iso,
  size,
  fontSize,
  preview,
  hasText,
  onPress,
}: Props) {
  const colors = useColors();

  if (!iso) {
    return <View style={{ width: size, height: size }} />;
  }

  const dayNum = parseInt(iso.slice(-2), 10);
  const future = isFuture(iso);
  const today = isToday(iso);
  const hasPhoto = !!preview;

  const baseRadius = Math.max(6, Math.round(size * 0.2));

  // --- State resolution ---
  let bg = "transparent";
  let textColor = colors.textMuted;
  let borderColor = "transparent";
  let borderWidth = 0;
  let fontFamily = "SpaceGrotesk_400Regular";
  let opacity = 1;

  if (future) {
    textColor = colors.textMuted;
    opacity = 0.3;
  } else if (hasPhoto) {
    // Image fills cell; number shown bottom-right
    textColor = today ? colors.accent : "rgba(255,255,255,0.9)";
    fontFamily = today ? "SpaceGrotesk_700Bold" : "SpaceGrotesk_500Medium";
    if (today) {
      borderColor = colors.accent;
      borderWidth = 1.5;
    }
  } else if (hasText) {
    bg = colors.accentDim;
    textColor = today ? colors.accent : colors.foreground;
    fontFamily = today ? "SpaceGrotesk_700Bold" : "SpaceGrotesk_500Medium";
    if (today) {
      borderColor = colors.accent;
      borderWidth = 1.5;
    }
  } else if (today) {
    borderColor = colors.accent;
    borderWidth = 1.5;
    textColor = colors.accent;
    fontFamily = "SpaceGrotesk_700Bold";
  } else {
    textColor = colors.textMuted;
    fontFamily = "SpaceGrotesk_400Regular";
  }

  const cell = (
    <View
      style={[
        styles.cell,
        {
          width: size,
          height: size,
          borderRadius: baseRadius,
          backgroundColor: bg,
          borderColor,
          borderWidth,
        },
      ]}
    >
      {hasPhoto && preview ? (
        <>
          <Image
            source={{ uri: preview }}
            style={[StyleSheet.absoluteFill, { borderRadius: baseRadius - 1 }]}
            contentFit="cover"
            transition={150}
          />
          {/* Subtle dark overlay — bg-black/10 */}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: baseRadius - 1,
                backgroundColor: "rgba(0,0,0,0.12)",
              },
            ]}
          />
        </>
      ) : null}

      {/* Accent dot for text-only entries — centered below number */}
      {hasText && !hasPhoto ? (
        <View style={styles.dotWrap} pointerEvents="none">
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
        </View>
      ) : null}

      {/* Day number */}
      {hasPhoto ? (
        // Bottom-right for photo cells
        <Text
          style={[
            styles.numBottomRight,
            { color: textColor, fontSize, fontFamily },
          ]}
        >
          {dayNum}
        </Text>
      ) : (
        <Text
          style={[
            styles.num,
            { color: textColor, fontSize, fontFamily, opacity },
          ]}
        >
          {dayNum}
        </Text>
      )}
    </View>
  );

  // Future dates are not pressable
  if (future || !onPress) {
    return cell;
  }

  return (
    <Pressable
      onPress={() => onPress(iso)}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      {cell}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  num: {
    letterSpacing: 0.2,
  },
  numBottomRight: {
    position: "absolute",
    bottom: 3,
    right: 5,
    letterSpacing: 0.2,
  },
  dotWrap: {
    position: "absolute",
    bottom: 5,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
