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
            borderColor: colors.border,
            backgroundColor: colors.cardAlt,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
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
            <Text style={[styles.initials, { color: colors.accent }]}>
              {initials(name)}
            </Text>
          </View>
        )}
      </Pressable>

      <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
      <Text style={[styles.count, { color: colors.mutedForeground }]}>
        {count} {memoryWord} logged
      </Text>
    </View>
  );
}

const SIZE = 88;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 0,
  },
  avatarWrap: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
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
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: 1,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    letterSpacing: -0.2,
    marginTop: 12,
  },
  count: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    letterSpacing: 0.2,
    marginTop: 4,
  },
});
