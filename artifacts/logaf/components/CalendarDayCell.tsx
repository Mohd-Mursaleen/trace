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
  const logged = hasPhoto || hasText;

  const baseRadius = Math.max(8, Math.round(size * 0.22));

  let bg: string = "transparent";
  let textColor: string = colors.textDim;
  let borderColor: string = "transparent";
  let borderWidth = 0;

  if (future) {
    textColor = colors.textDim;
  } else if (logged && hasPhoto) {
    textColor = "#fff";
  } else if (logged) {
    bg = colors.accentSoft;
    textColor = colors.accent;
  } else {
    textColor = colors.mutedForeground;
  }

  if (today) {
    borderColor = colors.accent;
    borderWidth = 1.5;
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
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: baseRadius - 1,
                backgroundColor: "rgba(0,0,0,0.32)",
              },
            ]}
          />
        </>
      ) : null}

      {logged && !hasPhoto ? (
        <View
          style={[styles.dot, { backgroundColor: colors.accent }]}
          pointerEvents="none"
        />
      ) : null}

      <Text
        style={[
          styles.num,
          { color: textColor, fontSize, opacity: future ? 0.35 : 1 },
        ]}
      >
        {dayNum}
      </Text>
    </View>
  );

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
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },
  dot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
