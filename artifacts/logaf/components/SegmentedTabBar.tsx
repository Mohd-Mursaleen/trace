import { Feather } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

/**
 * Inline type — avoids importing @react-navigation/bottom-tabs directly
 * (it's a transitive dep of expo-router, not in our package.json).
 * Structural typing ensures BottomTabBarProps is assignable to this.
 */
type Route = { key: string; name: string };
type TabBarProps = {
  state: { routes: Route[]; index: number };
  navigation: { navigate: (name: string) => void };
  descriptors: Record<string, { options: Record<string, unknown> }>;
};

const TABS: { name: string; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] =
  [
    { name: "index", label: "Journal", icon: "book-open" },
    { name: "search", label: "Search", icon: "zap" },
  ];

const TAB_W = 126;
const PILL_H = 52;
const PAD = 5;

/**
 * Floating pill tab bar.
 *
 * Renders a centered dark pill with a sliding accent-colored indicator.
 * Hides itself on screens that set tabBarStyle: { display: 'none' }.
 */
export function SegmentedTabBar({ state, navigation, descriptors }: TabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Filter to the two app tabs we actually care about.
  const visibleTabs = TABS.filter((t) => state.routes.some((r) => r.name === t.name));
  const activeIndex = Math.max(
    0,
    visibleTabs.findIndex((t) => t.name === state.routes[state.index]?.name),
  );

  // Sliding indicator — spring between tabs.
  const indicatorX = useRef(new Animated.Value(activeIndex * TAB_W)).current;
  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: activeIndex * TAB_W,
      useNativeDriver: true,
      damping: 22,
      stiffness: 240,
      mass: 0.75,
    }).start();
  }, [activeIndex, indicatorX]);

  // Hide on screens that opt out (onboarding, settings, etc.).
  const activeRoute = state.routes[state.index];
  const opts = activeRoute ? descriptors[activeRoute.key]?.options : undefined;
  const tsOpt = opts?.tabBarStyle as { display?: string } | undefined;
  if (tsOpt?.display === "none") return null;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom + (Platform.OS === "ios" ? 6 : 10) },
      ]}
    >
      <View
        style={[
          styles.pill,
          { backgroundColor: colors.surface, borderColor: colors.borderStrong },
        ]}
      >
        {/* Sliding fill indicator */}
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: colors.accent,
              transform: [{ translateX: indicatorX }],
            },
          ]}
        />

        {visibleTabs.map((tab, idx) => {
          const isActive = idx === activeIndex;
          const route = state.routes.find((r) => r.name === tab.name);
          return (
            <Pressable
              key={tab.name}
              onPress={() => route && navigation.navigate(route.name)}
              style={styles.tab}
            >
              <Feather
                name={tab.icon}
                size={16}
                color={isActive ? "#0a0a0a" : colors.textMuted}
              />
              <Text style={[styles.label, { color: isActive ? "#0a0a0a" : colors.textMuted }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    alignItems: "center",
    paddingTop: 10,
  },
  pill: {
    flexDirection: "row",
    width: TAB_W * 2 + PAD * 2,
    height: PILL_H,
    borderRadius: PILL_H / 2,
    borderWidth: 1,
    overflow: "hidden",
    padding: PAD,
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 10,
  },
  indicator: {
    position: "absolute",
    top: PAD,
    left: PAD,
    width: TAB_W,
    height: PILL_H - PAD * 2,
    borderRadius: (PILL_H - PAD * 2) / 2,
  },
  tab: {
    width: TAB_W,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  label: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
    letterSpacing: 0.1,
  },
});
