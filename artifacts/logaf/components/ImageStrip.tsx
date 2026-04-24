import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useJournalStore } from "@/hooks/useJournalStore";

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
};

export function ImageStrip({ images, onChange }: Props) {
  const colors = useColors();
  const { copyImageToLocal } = useJournalStore();

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to attach images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled) return;
    const newOnes = await Promise.all(
      result.assets.map((a) => copyImageToLocal(a.uri)),
    );
    onChange([...images, ...newOnes]);
  };

  const captureFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow camera access to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    const local = await copyImageToLocal(asset.uri);
    onChange([...images, local]);
  };

  const remove = (uri: string) => {
    Alert.alert("Remove image?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => onChange(images.filter((i) => i !== uri)),
      },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.actions}>
        <Pressable
          onPress={pickFromLibrary}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: colors.cardAlt,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="image" size={16} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text }]}>
            Photos
          </Text>
        </Pressable>
        <Pressable
          onPress={captureFromCamera}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: colors.cardAlt,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="camera" size={16} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text }]}>
            Camera
          </Text>
        </Pressable>
      </View>

      {images.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {images.map((uri) => (
            <Pressable
              key={uri}
              onLongPress={() => remove(uri)}
              style={({ pressed }) => [
                styles.thumbWrap,
                { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
              <Pressable
                onPress={() => remove(uri)}
                hitSlop={8}
                style={[
                  styles.removeBtn,
                  { backgroundColor: "rgba(0,0,0,0.6)" },
                ]}
              >
                <Feather name="x" size={12} color="#fff" />
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 0.1,
  },
  strip: {
    gap: 8,
    paddingVertical: 2,
  },
  thumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
