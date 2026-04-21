import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  name: string;
  photoUri: string;
  count: number;
  onPress: () => void;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export function ProfileHero({ name, photoUri, count, onPress }: Props) {
  const colors = useColors();
  const displayName = name.trim() || "My Journal";
  const memoryWord = count === 1 ? "memory" : "memories";

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.avatarWrap,
          {
            borderColor: colors.borderStrong,
            backgroundColor: colors.cardAlt,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={[styles.initials, { color: colors.textDim }]}>
              {initials(name)}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.glow,
            { borderColor: colors.accentRing, opacity: 0.45 },
          ]}
          pointerEvents="none"
        />
      </Pressable>

      <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
      <Text style={[styles.count, { color: colors.mutedForeground }]}>
        {count} {memoryWord} logged
      </Text>
    </View>
  );
}

const SIZE = 116;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  avatarWrap: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: "Inter_500Medium",
    fontSize: 36,
    letterSpacing: 1,
  },
  glow: {
    position: "absolute",
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: SIZE / 2 + 3,
    borderWidth: 1,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    letterSpacing: -0.2,
    marginTop: 4,
  },
  count: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
